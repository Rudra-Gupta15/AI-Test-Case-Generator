import json
import logging
import asyncio
import concurrent.futures
from playwright.async_api import async_playwright
from app.ollama_client import _ollama_chat
from app.config import DEFAULT_FAST_MODEL

logger = logging.getLogger(__name__)

ACTION_SYSTEM_PROMPT = """You are an AI browser automation agent.
You are given the current state of a web page DOM (simplified) and the current test step we are trying to accomplish.
Your job is to return a JSON object describing the Playwright action to take on the page to accomplish the current step.

Allowed actions:
- "click": click an element. Requires "selector".
- "fill": type text into an input. Requires "selector" and "value".
- "press": press a keyboard key (e.g. "Enter"). Requires "key".
- "wait": wait for some time (e.g., 2000 milliseconds). Requires "ms".
- "done": the step is completed, move to next step.

Choose selectors carefully based on the DOM provided (e.g., id, name, placeholder, text).
If you cannot find a suitable selector, or if the step is already accomplished, use "done".

Respond ONLY with valid JSON in this exact shape:
{
    "action": "...",
    "selector": "...",
    "value": "...",
    "key": "...",
    "ms": 0,
    "reasoning": "..."
}
"""

VERIFICATION_SYSTEM_PROMPT = """You are an AI verification agent.
You are given the current DOM of a web page after a test case has been executed, and the "Expected Result" from the test case.
Determine if the test case passed or failed based on the expected result and the provided DOM.

Respond ONLY with valid JSON in this exact shape:
{
    "status": "Pass|Fail",
    "actual_result": "Description of what is actually on the screen",
    "reasoning": "Why it passed or failed"
}
"""

async def clean_dom(page):
    """Extract a simplified version of the DOM to fit in context window."""
    script = '''
    () => {
        // Clone body to not affect live page
        const clone = document.body.cloneNode(true);
        // Remove unwanted tags
        const tagsToRemove = ['script', 'style', 'svg', 'path', 'noscript', 'iframe'];
        tagsToRemove.forEach(tag => {
            const elements = clone.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });
        
        // Remove comments
        const iterator = document.createNodeIterator(clone, NodeFilter.SHOW_COMMENT, () => NodeFilter.FILTER_ACCEPT);
        let currentNode;
        const comments = [];
        while (currentNode = iterator.nextNode()) {
            comments.push(currentNode);
        }
        comments.forEach(comment => comment.remove());

        return clone.innerHTML;
    }
    '''
    try:
        dom_html = await page.evaluate(script)
        # Optional: Further truncate if too long
        return dom_html[:8000] 
    except Exception as e:
        logger.error(f"Failed to clean DOM: {e}")
        return "<html><body>Error extracting DOM</body></html>"


async def get_next_action(dom: str, step: str) -> dict:
    user_content = f"""CURRENT STEP: {step}
    
CURRENT DOM:
{dom}

What is the next action to take?"""
    messages = [
        {"role": "system", "content": ACTION_SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]
    try:
        result = await _ollama_chat(messages, DEFAULT_FAST_MODEL)
        return result
    except Exception as e:
        logger.error(f"AI Action Error: {e}")
        return {"action": "done", "reasoning": "Error calling AI"}


async def verify_result(dom: str, expected_result: str) -> dict:
    user_content = f"""EXPECTED RESULT: {expected_result}
    
FINAL DOM:
{dom}

Did we achieve the expected result?"""
    messages = [
        {"role": "system", "content": VERIFICATION_SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]
    try:
        result = await _ollama_chat(messages, DEFAULT_FAST_MODEL)
        return result
    except Exception as e:
        logger.error(f"AI Verification Error: {e}")
        return {"status": "Fail", "actual_result": "Error calling AI verification", "reasoning": str(e)}


async def _execute_playwright_async(test_case: dict, target_url: str):
    logs = []
    def log(msg):
        print(f"[LIVE TEST] {msg}")
        logs.append(msg)
        
    steps = test_case.get("steps", [])
    expected_result = test_case.get("expected_result", "")
    
    log(f"Starting execution of {test_case.get('id')} on {target_url}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            await page.goto(target_url, wait_until="networkidle")
            log("Navigated to target URL.")
            
            for i, step in enumerate(steps):
                log(f"Executing step {i+1}: {step}")
                step_done = False
                attempts = 0
                
                while not step_done and attempts < 3:
                    attempts += 1
                    dom = await clean_dom(page)
                    action_json = await get_next_action(dom, step)
                    
                    action = action_json.get("action")
                    selector = action_json.get("selector")
                    log(f"  -> AI decided: {action} on {selector} (Reason: {action_json.get('reasoning')})")
                    
                    try:
                        if action == "click" and selector:
                            await page.click(selector, timeout=5000)
                        elif action == "fill" and selector:
                            value = action_json.get("value", "")
                            await page.fill(selector, value, timeout=5000)
                        elif action == "press":
                            key = action_json.get("key", "Enter")
                            await page.keyboard.press(key)
                        elif action == "wait":
                            ms = action_json.get("ms", 2000)
                            await page.wait_for_timeout(ms)
                        elif action == "done":
                            step_done = True
                            
                        # Brief pause for UI updates
                        await page.wait_for_timeout(1000)
                    except Exception as e:
                        log(f"  -> Error executing {action}: {str(e)}")
                        # If we fail to interact, mark step done to move on or let next iteration try
                        step_done = True
                        
            # Verification phase
            log("All steps completed. Starting verification.")
            await page.wait_for_timeout(2000)
            final_dom = await clean_dom(page)
            verification = await verify_result(final_dom, expected_result)
            
            log(f"Verification Result: {verification.get('status')}")
            log(f"Actual Result: {verification.get('actual_result')}")
            
            test_case["status"] = verification.get("status", "Fail")
            test_case["actual_result"] = verification.get("actual_result", "Execution failed")
            test_case["executed_by"] = "Playwright+Ollama"
            
        except Exception as e:
            log(f"Fatal error during execution: {e}")
            test_case["status"] = "Fail"
            test_case["actual_result"] = f"Fatal execution error: {str(e)}"
        finally:
            await browser.close()
            
    return test_case, logs


def _run_playwright_in_thread(test_case: dict, target_url: str):
    """
    Windows fix: asyncio.SelectorEventLoop (used by uvicorn on Windows) cannot
    spawn subprocesses. Playwright needs create_subprocess_exec to launch Chromium.
    Solution: run Playwright inside a brand-new thread that creates its own
    ProactorEventLoop, which fully supports subprocesses on Windows.
    """
    # Switch this thread's policy to ProactorEventLoop before creating the loop
    if hasattr(asyncio, 'WindowsProactorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_execute_playwright_async(test_case, target_url))
    finally:
        loop.close()


async def execute_test_case_live(test_case: dict, target_url: str):
    """
    Public entry point. Offloads the Playwright session to a thread pool
    so the ProactorEventLoop fix can be applied without affecting uvicorn's
    main SelectorEventLoop.
    """
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        result = await loop.run_in_executor(
            pool, _run_playwright_in_thread, test_case, target_url
        )
    return result
