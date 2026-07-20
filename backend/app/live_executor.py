import json
import logging
import asyncio
import concurrent.futures
import base64
from playwright.async_api import async_playwright
from app.ollama_client import _ollama_chat
from app.config import DEFAULT_FAST_MODEL

logger = logging.getLogger(__name__)

# ─── Human-in-the-Loop keyword triggers ───────────────────────────────────────
# If a test step contains any of these keywords, the executor will PAUSE
# and wait for the human to provide input before continuing.
HUMAN_TRIGGER_KEYWORDS = [
    "otp", "one-time password", "one time password",
    "verification code", "verify code", "2fa", "two-factor",
    "captcha", "recaptcha", "i am not a robot",
    "select profile", "choose profile", "profile selection",
    "select account", "choose account",
    "forgot password", "password reminder", "reset password",
    "security question", "secret question",
    "phone number", "mobile number", "verify phone",
    "email verification", "verify email",
]

# Detect which type of human input is needed based on the step text
def _detect_hitl_type(step: str) -> dict | None:
    """
    Returns a dict describing what human input is needed, or None if no
    human intervention is required.
    """
    step_lower = step.lower()
    
    if any(k in step_lower for k in ["otp", "one-time password", "one time password", "verification code", "verify code", "2fa", "two-factor"]):
        return {
            "type": "otp",
            "title": "⏸ OTP / Verification Code Required",
            "description": "The AI has reached a step that requires a one-time password or verification code. Please check your phone or email and enter the code below.",
            "fields": [{"key": "otp", "label": "OTP / Verification Code", "type": "text", "placeholder": "Enter the code you received"}]
        }
    
    if any(k in step_lower for k in ["captcha", "recaptcha", "i am not a robot"]):
        return {
            "type": "captcha",
            "title": "⏸ CAPTCHA Challenge",
            "description": "The AI has encountered a CAPTCHA. Please look at the browser window, solve the CAPTCHA manually, and then click Continue.",
            "fields": [],  # No text input needed — user solves it in the browser
            "screenshot": True  # Signal to take a screenshot for context
        }
    
    if any(k in step_lower for k in ["select profile", "choose profile", "profile selection", "select account", "choose account"]):
        return {
            "type": "profile_selection",
            "title": "⏸ Profile / Account Selection",
            "description": "The AI needs you to select a profile or account. Please look at the browser window and click the correct profile, then click Continue.",
            "fields": [],
        }
    
    if any(k in step_lower for k in ["forgot password", "password reminder", "reset password"]):
        return {
            "type": "password_reminder",
            "title": "⏸ Password Reminder / Reset",
            "description": "The AI has reached a password reset or reminder step. Please provide the information needed to continue.",
            "fields": [
                {"key": "email", "label": "Email / Username", "type": "text", "placeholder": "Enter your email or username"},
            ]
        }
    
    if any(k in step_lower for k in ["phone number", "mobile number", "verify phone", "email verification", "verify email"]):
        return {
            "type": "contact_verification",
            "title": "⏸ Contact Verification Required",
            "description": "The AI needs you to provide or verify a contact method (phone/email).",
            "fields": [
                {"key": "contact", "label": "Phone / Email", "type": "text", "placeholder": "Enter phone number or email"},
            ]
        }

    return None


# ─── Global HITL state store ───────────────────────────────────────────────────
# Maps execution_id -> { "event": asyncio.Event, "input": dict, "status": str, "hitl_info": dict }
_pending_human_inputs: dict[str, dict] = {}


def create_execution_slot(execution_id: str):
    """Register a new execution slot before running."""
    _pending_human_inputs[execution_id] = {
        "event": asyncio.Event(),
        "input": {},
        "status": "running",
        "hitl_info": None,
        "logs": []
    }


def get_execution_slot(execution_id: str) -> dict | None:
    return _pending_human_inputs.get(execution_id)


def remove_execution_slot(execution_id: str):
    _pending_human_inputs.pop(execution_id, None)


def submit_human_input(execution_id: str, data: dict):
    """Called by the /resume endpoint. Stores user input and fires the event."""
    slot = _pending_human_inputs.get(execution_id)
    if slot:
        slot["input"] = data
        slot["status"] = "running"
        slot["hitl_info"] = None
        slot["event"].set()


# ─── System prompts ────────────────────────────────────────────────────────────

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


# ─── DOM helpers ───────────────────────────────────────────────────────────────

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
        return dom_html[:8000] 
    except Exception as e:
        logger.error(f"Failed to clean DOM: {e}")
        return "<html><body>Error extracting DOM</body></html>"


async def take_screenshot_b64(page) -> str:
    """Take a screenshot and return it as a base64 string for display in the modal."""
    try:
        screenshot_bytes = await page.screenshot(type="png")
        return base64.b64encode(screenshot_bytes).decode("utf-8")
    except Exception as e:
        logger.error(f"Screenshot failed: {e}")
        return ""


# ─── AI helpers ───────────────────────────────────────────────────────────────

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


# ─── Core execution ────────────────────────────────────────────────────────────

async def _execute_playwright_async(
    test_case: dict,
    target_url: str,
    execution_id: str,
    site_username: str | None = None,
    site_password: str | None = None
):
    slot = _pending_human_inputs.get(execution_id)
    logs = slot["logs"] if slot else []

    def log(msg):
        print(f"[LIVE TEST] {msg}")
        logs.append(msg)
        if slot:
            slot["logs"] = logs

    steps = list(test_case.get("steps", []))
    if site_username and site_password:
        steps.insert(0, f"Login using username '{site_username}' and password '{site_password}'")
        log("Injected Login step based on provided Site Credentials.")

    expected_result = test_case.get("expected_result", "")
    log(f"Starting execution of {test_case.get('id')} on {target_url}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=50)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto(target_url, wait_until="networkidle")
            log("Navigated to target URL.")

            for i, step in enumerate(steps):
                log(f"Executing step {i+1}: {step}")

                # ── HITL Check ─────────────────────────────────────────────
                hitl_info = _detect_hitl_type(step)
                if hitl_info:
                    log(f"  -> HITL trigger detected: {hitl_info['type']}. Pausing for human input.")

                    # Take screenshot if needed (e.g. CAPTCHA)
                    if hitl_info.get("screenshot"):
                        screenshot_b64 = await take_screenshot_b64(page)
                        hitl_info["screenshot_b64"] = screenshot_b64

                    # Signal the frontend we're waiting
                    if slot:
                        slot["status"] = "waiting_for_human"
                        slot["hitl_info"] = hitl_info
                        slot["event"].clear()

                    # Wait indefinitely for the frontend to resume us
                    if slot:
                        await slot["event"].wait()

                    # Get the user's submitted data and use it in the step
                    human_data = slot["input"] if slot else {}
                    log(f"  -> Resumed with human input: {list(human_data.keys())}")

                    # Build an augmented step description with the real values
                    if human_data:
                        augmented_values = ", ".join(f"{k}='{v}'" for k, v in human_data.items())
                        step = f"{step} [Human provided: {augmented_values}]"

                # ── Normal AI execution for this step ─────────────────────
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

                        await page.wait_for_timeout(1000)
                    except Exception as e:
                        log(f"  -> Error executing {action}: {str(e)}")
                        step_done = True

            # ── Verification ───────────────────────────────────────────────
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
            if slot:
                slot["status"] = "done"

    return test_case, logs


# ─── Thread wrapper ────────────────────────────────────────────────────────────

def _run_playwright_in_thread(
    test_case: dict,
    target_url: str,
    execution_id: str,
    site_username: str | None = None,
    site_password: str | None = None
):
    """
    Windows fix: asyncio.SelectorEventLoop (used by uvicorn on Windows) cannot
    spawn subprocesses. Playwright needs create_subprocess_exec to launch Chromium.
    Solution: run Playwright inside a brand-new thread that creates its own
    ProactorEventLoop, which fully supports subprocesses on Windows.
    """
    if hasattr(asyncio, 'WindowsProactorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            _execute_playwright_async(test_case, target_url, execution_id, site_username, site_password)
        )
    finally:
        loop.close()


# ─── Public entry point ────────────────────────────────────────────────────────

async def execute_test_case_live(
    test_case: dict,
    target_url: str,
    execution_id: str,
    site_username: str | None = None,
    site_password: str | None = None
):
    """
    Public entry point. Offloads the Playwright session to a thread pool
    so the ProactorEventLoop fix can be applied without affecting uvicorn's
    main SelectorEventLoop.
    """
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        result = await loop.run_in_executor(
            pool, _run_playwright_in_thread, test_case, target_url, execution_id, site_username, site_password
        )
    return result
