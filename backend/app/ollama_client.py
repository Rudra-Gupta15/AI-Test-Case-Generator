"""
Two LLM calls:
1. understand() - reads BRD + FSD + Figma screens + image descriptions,
   produces a structured "here's what I understood" summary.
2. generate_test_cases() - takes that understanding + optional user prompt,
   produces a structured test case list (baseline + project-specific,
   including valid-input and invalid-input/edge-case scenarios).
"""
import json
import base64
import httpx
from app.config import OLLAMA_BASE_URL, DEFAULT_FAST_MODEL, DEFAULT_DEEP_MODEL, DEFAULT_BASELINE_CATEGORIES


UNDERSTAND_SYSTEM_PROMPT = """You are a senior QA/Business Analyst reviewing project documents BEFORE development begins.
You will receive:
- BRD (Business Requirements Document) text — what the product should do
- FSD (Functional Spec Document) text — how it should behave in detail
- Figma screen/frame names — the designed screens
- Reference image descriptions — visual mockups/screenshots

Your job: read everything and produce a structured understanding summary. Identify:
1. Product type and one-line purpose
2. Core features (list, each tied to its source: BRD/FSD/Figma/Image)
3. User flows identified (e.g. "Checkout flow: Cart -> Address -> Payment -> Confirmation")
4. Inconsistencies or contradictions BETWEEN the documents (e.g. BRD mentions a feature with no FSD detail, or FSD describes a screen Figma doesn't have)
5. Gaps — anything mentioned in one document but missing detail in another

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "product_type": "...",
  "purpose": "...",
  "features": [{"name": "...", "source": "BRD|FSD|Figma|Image|Multiple", "description": "..."}],
  "flows": [{"name": "...", "steps": ["...", "..."]}],
  "inconsistencies": [{"issue": "...", "severity": "High|Medium|Low", "detail": "..."}],
  "gaps": [{"item": "...", "detail": "..."}]
}
"""

TESTGEN_SYSTEM_PROMPT = """You are a senior QA engineer designing a test case suite BEFORE the product is built,
based on a structured understanding of BRD/FSD/Figma/reference images.

Generate test cases a human tester will manually execute once the product is built. Include:
- Valid/happy-path input scenarios
- Invalid/faulty input scenarios (empty fields, wrong format, boundary values, special characters)
- UI/design-matching checks tied to Figma screens
- Baseline checks that apply to most web/app projects: Navigation, Form Validation, Responsiveness, Error Handling, Accessibility

CRITICAL WRITING RULES:
1. SELF-EXPLAINABLE TEST CASE DESCRIPTION:
   Each test case "description" must be fully self-explainable. When read, it must immediately make the objective of the test clear.
   - Good: "Verify that a user can successfully add a new income transaction"
   - Good: "Verify that the system displays an error message when the amount field is left empty"
   - Bad (Do NOT use): "Add Income Transaction — Happy Path", "Invalid Amount", "Form validation".
2. SIMPLE, EASY-TO-UNDERSTAND LANGUAGE:
   Use plain, simple, and clear English for all fields. Avoid complex technical jargon, heavy phrasing, or complicated sentences.
   Write the preconditions, steps, test data, expected results, and postconditions so that any non-technical person can read it and instantly understand what needs to be done and what will happen. Keep it concise, friendly, and straightforward.
3. JSON SCHEMA CONFORMANCE:
   The USER FOCUS PROMPT may ask you to include specific fields (e.g., "test ID, feature, precondition, steps, input data, expected result, and pass/fail criteria"). You MUST map these requested fields to the exact keys in the JSON schema below:
   - "test ID" -> "id"
   - "feature" or "module" -> "section"
   - "precondition" -> "precondition"
   - "steps" -> "steps"
   - "input data" -> "test_data"
   - "expected result" -> "expected_result"
   - "pass/fail criteria" -> "expected_result" (and leave "status" empty)
   Do NOT under any circumstances output other JSON keys.

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "summary": {"total": 0, "by_priority": {"P0": 0, "P1": 0, "P2": 0, "P3": 0}},
  "test_cases": [
    {
      "id": "TC-001",
      "section": "e.g. Module 2: OTP Verification (Login Flow)",
      "category": "e.g. OTP (Positive) OR OTP (Negative) OR Login (UI)",
      "scenario": "e.g. Valid OTP entered after Login",
      "description": "e.g. Verify user is verified with correct OTP (must be a clear objective sentence)",
      "precondition": "e.g. User on OTP screen; OTP received on email",
      "steps": [
        "1. Check email for OTP",
        "2. Enter 4-digit OTP",
        "3. Tap 'Verify'"
      ],
      "test_data": "e.g. OTP: [valid from email]",
      "expected_result": "e.g. OTP verified; Navigates to Home/Dashboard",
      "actual_result": "",
      "postcondition": "e.g. User on Home screen",
      "status": "",
      "severity": "Critical|High|Medium|Low",
      "priority": "P0|P1|P2|P3",
      "executed_by": ""
    }
  ]
}
"""


async def _ollama_chat(messages: list, model: str, images_b64: list[str] | None = None):
    if images_b64 and messages:
        # attach images to the last user message (Ollama multimodal format)
        messages[-1]["images"] = images_b64

    body = {
        "model": model,
        "messages": messages,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.0
        }
    }

    async with httpx.AsyncClient(timeout=240, trust_env=False, proxies=None) as client:
        resp = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=body)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("message", {}).get("content", "{}")
        return json.loads(content)


async def understand(brd_text: str, fsd_text: str, figma_screens: list, image_paths: list[str], deep: bool = False):
    model = DEFAULT_DEEP_MODEL if deep else DEFAULT_FAST_MODEL

    user_content = f"""BRD TEXT:
{brd_text or '[No BRD provided]'}

FSD TEXT:
{fsd_text or '[No FSD provided]'}

FIGMA SCREENS FOUND:
{json.dumps(figma_screens, indent=2) if figma_screens else '[No Figma screens found]'}

REFERENCE IMAGES: {len(image_paths)} image(s) attached for visual context.
"""

    messages = [
        {"role": "system", "content": UNDERSTAND_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    images_b64 = []
    if image_paths and not deep:  # only vision model (fast) supports images
        for p in image_paths[:5]:  # cap to avoid huge payloads
            with open(p, "rb") as f:
                images_b64.append(base64.b64encode(f.read()).decode("utf-8"))

    try:
        return await _ollama_chat(messages, model, images_b64 or None)
    except Exception as e:
        return {
            "product_type": "Unknown",
            "purpose": f"LLM unavailable: {str(e)[:150]}",
            "features": [],
            "flows": [],
            "inconsistencies": [],
            "gaps": [],
        }


async def generate_test_cases(understanding: dict, user_prompt: str = "", deep: bool = False):
    model = DEFAULT_DEEP_MODEL if deep else DEFAULT_FAST_MODEL

    user_content = f"""UNDERSTANDING SUMMARY (from prior analysis):
{json.dumps(understanding, indent=2)}

USER FOCUS PROMPT: {user_prompt or '[None provided - generate balanced coverage across all identified features and flows]'}

BASELINE CATEGORIES TO ALWAYS INCLUDE: {', '.join(DEFAULT_BASELINE_CATEGORIES)}
"""

    messages = [
        {"role": "system", "content": TESTGEN_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        return await _ollama_chat(messages, model)
    except Exception as e:
        return {
            "summary": {"total": 0, "by_priority": {"P0": 0, "P1": 0, "P2": 0, "P3": 0}},
            "test_cases": [],
            "error": f"LLM unavailable: {str(e)[:150]}",
        }
