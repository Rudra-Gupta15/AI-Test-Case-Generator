"""
Multi-stage LLM pipeline for deterministic, consistent test case generation:
  1. understand()                  - reads BRD + FSD + Figma + images → structured understanding
  2. plan_test_cases()             - understanding → deterministic test plan with exact counts per feature
  3. generate_feature_test_cases() - generates test cases for ONE feature at a time
  4. merge_and_validate()          - combines all per-feature results, assigns sequential IDs, validates
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
2. Core features (list, each tied to its source: BRD/FSD/Figma/Image). CRITICAL: You MUST extract EVERY SINGLE feature mentioned in the input documents. Do not summarize or skip any features, no matter how small.
3. User flows identified (e.g. "Checkout flow: Cart -> Address -> Payment -> Confirmation"). CRITICAL: List ALL user flows comprehensively.
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


PLAN_SYSTEM_PROMPT = """You are a senior QA test planner. Given a structured understanding of a product (features, flows, gaps, inconsistencies), you must produce an EXACT test plan.

For EACH feature in the understanding, decide:
- How many Positive test cases (happy path, valid inputs)
- How many Negative test cases (invalid inputs, empty fields, boundary values)
- How many Edge test cases (special characters, max length, concurrent actions, etc.)

Additionally, include baseline categories that apply to ALL web/app projects:
- Navigation, Form Validation, Responsiveness, Error Handling, Accessibility

RULES:
1. Every single feature from the understanding MUST appear in the plan. Do NOT skip any.
2. The minimum per feature is: 2 Positive + 2 Negative + 1 Edge = 5 test cases.
3. Complex features (with many fields/rules) should have more (up to 8-10).
4. Each baseline category should have 2-3 test cases.
5. The plan is a CONTRACT — the generation step will follow it exactly.

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "plan": [
    {
      "feature_name": "...",
      "feature_description": "...",
      "section": "e.g. Module 1: Transaction Logging",
      "positive_count": 3,
      "negative_count": 3,
      "edge_count": 2,
      "total": 8,
      "notes": "Key areas to cover: ..."
    }
  ],
  "baseline": [
    {
      "category": "Navigation",
      "count": 3,
      "notes": "..."
    }
  ],
  "grand_total": 0
}
"""


FEATURE_TESTGEN_SYSTEM_PROMPT = """You are a senior QA engineer writing test cases for ONE specific feature.

You will receive:
- The product context (type and purpose)
- ONE feature with its description and the exact number of test cases to generate
- The types required: Positive (happy path), Negative (invalid input), Edge (boundary/special)

CRITICAL WRITING RULES:
1. SELF-EXPLAINABLE TEST CASE DESCRIPTION:
   Each test case "description" must be fully self-explainable. When read, it must immediately make the objective of the test clear.
   - Good: "Verify that a user can successfully add a new income transaction"
   - Good: "Verify that the system displays an error message when the amount field is left empty"
   - Bad (Do NOT use): "Add Income Transaction — Happy Path", "Invalid Amount", "Form validation".
2. SIMPLE, EASY-TO-UNDERSTAND LANGUAGE:
   Use plain, simple, and clear English for all fields. Avoid complex technical jargon, heavy phrasing, or complicated sentences.
   Write the preconditions, steps, test data, expected results, and postconditions so that any non-technical person can read it and instantly understand what needs to be done and what will happen. Keep it concise, friendly, and straightforward.
3. EXACT COUNT COMPLIANCE:
   You MUST generate EXACTLY the number of test cases requested. Not one more, not one less.
   - If asked for 3 Positive, 3 Negative, 2 Edge → produce exactly 8 test cases.
4. CATEGORY LABELING:
   - Positive test cases → category should be "FeatureName (Positive)"
   - Negative test cases → category should be "FeatureName (Negative)"
   - Edge test cases → category should be "FeatureName (Edge)"
5. PRIORITY ASSIGNMENT:
   - P0: Critical happy-path functionality (core business flow works)
   - P1: Important negative cases (validation, error handling)
   - P2: Edge cases and less critical paths
   - P3: Nice-to-have, cosmetic, low-risk scenarios
6. SEVERITY ASSIGNMENT:
   - Critical: System crash, data loss, security breach
   - High: Feature broken, major functionality blocked
   - Medium: Feature works but with issues
   - Low: Cosmetic, minor UI issues

Use placeholder IDs like "TC-001", "TC-002" etc. starting from TC-001 for each feature. They will be renumbered later.

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "test_cases": [
    {
      "id": "TC-001",
      "section": "e.g. Module 1: Transaction Logging",
      "category": "e.g. Transaction Logging (Positive)",
      "scenario": "e.g. Add a valid expense transaction",
      "description": "e.g. Verify that a user can successfully add a valid expense transaction with a positive amount, selected category, current date, and optional note",
      "precondition": "e.g. User is signed in and on the Monthly Dashboard screen",
      "steps": [
        "1. Tap the 'Add Transaction' button",
        "2. Select 'Expense' as the transaction type",
        "3. Enter a valid amount (e.g. 500)"
      ],
      "test_data": "e.g. Amount: 500, Category: Food, Date: Today",
      "expected_result": "e.g. Transaction is saved successfully and appears in the transaction list",
      "actual_result": "",
      "postcondition": "e.g. New transaction visible in the list",
      "status": "",
      "severity": "Critical|High|Medium|Low",
      "priority": "P0|P1|P2|P3",
      "executed_by": ""
    }
  ]
}
"""


BASELINE_TESTGEN_SYSTEM_PROMPT = """You are a senior QA engineer writing BASELINE test cases that apply to most web/mobile applications.

You will receive:
- The product context (type and purpose)
- A baseline category (e.g. Navigation, Form Validation, Responsiveness, Error Handling, Accessibility)
- The exact number of test cases to generate

These are GENERIC but PRODUCT-AWARE test cases. Tailor them to the specific product but they should test universal quality aspects.

CRITICAL WRITING RULES:
1. SELF-EXPLAINABLE: Each description must clearly state what is being verified.
2. SIMPLE LANGUAGE: Any non-technical person should understand it.
3. EXACT COUNT: Generate EXACTLY the number requested.
4. Category format: "Baseline - CategoryName"

Use placeholder IDs starting from TC-001. They will be renumbered later.

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "test_cases": [
    {
      "id": "TC-001",
      "section": "Baseline Quality Checks",
      "category": "Baseline - Navigation",
      "scenario": "...",
      "description": "...",
      "precondition": "...",
      "steps": ["..."],
      "test_data": "...",
      "expected_result": "...",
      "actual_result": "",
      "postcondition": "...",
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


# ──────────────────────────────────────────────────────────────────────
# Stage 1: UNDERSTAND  (unchanged)
# ──────────────────────────────────────────────────────────────────────
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


# ──────────────────────────────────────────────────────────────────────
# Stage 2: PLAN  (new — deterministic test plan with exact counts)
# ──────────────────────────────────────────────────────────────────────
async def plan_test_cases(understanding: dict, user_prompt: str = "", deep: bool = False):
    model = DEFAULT_DEEP_MODEL if deep else DEFAULT_FAST_MODEL

    user_content = f"""UNDERSTANDING SUMMARY:
{json.dumps(understanding, indent=2)}

USER FOCUS PROMPT: {user_prompt or '[None — generate balanced coverage across all features]'}

BASELINE CATEGORIES TO INCLUDE: {', '.join(DEFAULT_BASELINE_CATEGORIES)}

Remember: EVERY feature listed above MUST appear in the plan. Do not skip any feature.
"""

    messages = [
        {"role": "system", "content": PLAN_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        plan = await _ollama_chat(messages, model)
        # Validate: ensure every feature from understanding is in the plan
        feature_names_in_plan = {item["feature_name"].lower() for item in plan.get("plan", [])}
        for feature in understanding.get("features", []):
            if feature["name"].lower() not in feature_names_in_plan:
                # Force-add missing features
                plan["plan"].append({
                    "feature_name": feature["name"],
                    "feature_description": feature.get("description", ""),
                    "section": f"Module: {feature['name']}",
                    "positive_count": 2,
                    "negative_count": 2,
                    "edge_count": 1,
                    "total": 5,
                    "notes": "Auto-added — was missing from LLM plan"
                })
        # Recalculate grand total
        feature_total = sum(item.get("total", 0) for item in plan.get("plan", []))
        baseline_total = sum(item.get("count", 0) for item in plan.get("baseline", []))
        plan["grand_total"] = feature_total + baseline_total
        return plan
    except Exception as e:
        return {"error": f"Planning failed: {str(e)[:150]}"}


# ──────────────────────────────────────────────────────────────────────
# Stage 3: GENERATE PER-FEATURE  (new — one LLM call per feature)
# ──────────────────────────────────────────────────────────────────────
async def generate_feature_test_cases(product_context: dict, feature_plan: dict, deep: bool = False):
    """Generate test cases for a single feature based on the plan."""
    model = DEFAULT_DEEP_MODEL if deep else DEFAULT_FAST_MODEL

    user_content = f"""PRODUCT CONTEXT:
- Type: {product_context.get('product_type', 'Unknown')}
- Purpose: {product_context.get('purpose', 'Unknown')}

FEATURE TO TEST:
- Name: {feature_plan['feature_name']}
- Description: {feature_plan.get('feature_description', 'N/A')}
- Section: {feature_plan.get('section', 'General')}
- Key areas: {feature_plan.get('notes', 'N/A')}

EXACT COUNTS REQUIRED:
- Positive (happy path) test cases: {feature_plan.get('positive_count', 2)}
- Negative (invalid input) test cases: {feature_plan.get('negative_count', 2)}
- Edge (boundary/special) test cases: {feature_plan.get('edge_count', 1)}
- TOTAL: {feature_plan.get('total', 5)} test cases

You MUST produce EXACTLY {feature_plan.get('total', 5)} test cases. Not one more, not one less.
"""

    messages = [
        {"role": "system", "content": FEATURE_TESTGEN_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        result = await _ollama_chat(messages, model)
        return result.get("test_cases", [])
    except Exception as e:
        return []


async def generate_baseline_test_cases(product_context: dict, baseline_item: dict, deep: bool = False):
    """Generate baseline test cases for a single category."""
    model = DEFAULT_DEEP_MODEL if deep else DEFAULT_FAST_MODEL

    user_content = f"""PRODUCT CONTEXT:
- Type: {product_context.get('product_type', 'Unknown')}
- Purpose: {product_context.get('purpose', 'Unknown')}

BASELINE CATEGORY: {baseline_item['category']}
EXACT COUNT REQUIRED: {baseline_item.get('count', 2)} test cases
KEY AREAS: {baseline_item.get('notes', 'General baseline checks for this category')}

You MUST produce EXACTLY {baseline_item.get('count', 2)} test cases.
"""

    messages = [
        {"role": "system", "content": BASELINE_TESTGEN_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        result = await _ollama_chat(messages, model)
        return result.get("test_cases", [])
    except Exception as e:
        return []


# ──────────────────────────────────────────────────────────────────────
# Stage 4: MERGE + VALIDATE  (new — combine, renumber, verify)
# ──────────────────────────────────────────────────────────────────────
def merge_and_validate(all_test_cases: list, plan: dict) -> dict:
    """Merge all per-feature test case lists, assign sequential IDs, and build summary."""
    merged = []
    tc_counter = 1

    for tc in all_test_cases:
        tc["id"] = f"TC-{tc_counter:03d}"
        tc_counter += 1
        # Ensure all required fields exist
        tc.setdefault("actual_result", "")
        tc.setdefault("postcondition", "")
        tc.setdefault("status", "")
        tc.setdefault("executed_by", "")
        tc.setdefault("test_data", "N/A")
        merged.append(tc)

    # Build summary
    by_priority = {"P0": 0, "P1": 0, "P2": 0, "P3": 0}
    for tc in merged:
        p = tc.get("priority", "P2")
        if p in by_priority:
            by_priority[p] += 1

    return {
        "summary": {
            "total": len(merged),
            "by_priority": by_priority,
            "planned_total": plan.get("grand_total", 0)
        },
        "test_cases": merged
    }


# ──────────────────────────────────────────────────────────────────────
# Legacy single-call function (kept for backward compatibility)
# ──────────────────────────────────────────────────────────────────────
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


async def generate_test_cases(understanding: dict, user_prompt: str = "", deep: bool = False):
    """Legacy single-call generation — kept as fallback."""
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
