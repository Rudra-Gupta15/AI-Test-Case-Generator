"""
Multi-stage pipeline:
  Stage 1 (analyze):   parse BRD/FSD/Figma/images → understanding summary
  Stage 2 (plan):      understanding → deterministic test plan with exact counts
  Stage 3 (generate):  per-feature LLM calls → test cases for each feature + baselines
  Stage 4 (merge):     combine, renumber IDs, validate completeness

Split into stages so the UI can show progress at each checkpoint.
"""
import asyncio
from app.jobs import update_job
from app import doc_parser, figma_client, ollama_client


async def run_analysis(job_id: str, brd_path: str | None, fsd_path: str | None,
                        image_paths: list[str], figma_url: str | None,
                        figma_token: str | None, deep: bool):
    try:
        # ── Stage 1: Parse documents ──
        update_job(job_id, status="running", stage="parsing_documents")

        brd_text = doc_parser.truncate_for_llm(doc_parser.extract_text(brd_path)) if brd_path else ""
        fsd_text = doc_parser.truncate_for_llm(doc_parser.extract_text(fsd_path)) if fsd_path else ""

        update_job(job_id, stage="fetching_figma")
        figma_screens = []
        if figma_url and figma_token:
            try:
                file_key, node_id = figma_client.parse_figma_url(figma_url)
                summary = await figma_client.get_file_summary(file_key, figma_token, node_id)
                figma_screens = summary["screens"]
            except Exception as e:
                figma_screens = [{"name": f"[Figma fetch failed: {str(e)[:100]}]", "type": "ERROR"}]

        # ── Stage 1b: LLM Understanding ──
        update_job(job_id, stage="understanding")
        understanding = await ollama_client.understand(
            brd_text, fsd_text, figma_screens, image_paths, deep=deep
        )

        update_job(job_id, understanding=understanding)

        # ── Stage 2: Plan test cases ──
        update_job(job_id, stage="planning_tests")

        default_prompt = (
            "Generate test cases for each feature in the FSD, covering valid inputs, "
            "invalid inputs, and edge cases listed under each feature's validation rules. "
            "For each test case, include: test ID, feature, precondition, steps, "
            "input data, expected result, and pass/fail criteria. Flag any FSD behavior "
            "that has no corresponding test case, and flag any validation rule from the "
            "field tables that isn't testable as written (e.g. missing units, ambiguous limits)."
        )

        plan = await ollama_client.plan_test_cases(understanding, default_prompt, deep=deep)

        if "error" in plan:
            update_job(job_id, status="error", stage="error", error=plan["error"])
            return

        update_job(job_id, test_plan=plan)

        # ── Stage 3: Generate per-feature test cases ──
        update_job(job_id, stage="generating_tests")

        product_context = {
            "product_type": understanding.get("product_type", "Unknown"),
            "purpose": understanding.get("purpose", "Unknown"),
        }

        all_test_cases = []

        # 3a: Feature-specific test cases (concurrent)
        feature_plans = plan.get("plan", [])
        total_features = len(feature_plans)
        completed_features = 0
        sem = asyncio.Semaphore(5)

        async def generate_feature_with_progress(fp):
            nonlocal completed_features
            async with sem:
                cases = await ollama_client.generate_feature_test_cases(product_context, fp, deep=deep)
            completed_features += 1
            update_job(
                job_id,
                stage="generating_tests",
                generation_progress={
                    "current": completed_features,
                    "total": total_features,
                    "feature": fp.get("feature_name", "Unknown"),
                }
            )
            return cases

        feature_tasks = [generate_feature_with_progress(fp) for fp in feature_plans]
        feature_results = await asyncio.gather(*feature_tasks)
        for cases in feature_results:
            all_test_cases.extend(cases)

        # 3b: Baseline test cases (concurrent)
        baseline_plans = plan.get("baseline", [])
        
        async def generate_baseline_with_sem(bp):
            async with sem:
                return await ollama_client.generate_baseline_test_cases(product_context, bp, deep=deep)
                
        baseline_tasks = [generate_baseline_with_sem(bp) for bp in baseline_plans]
        baseline_results = await asyncio.gather(*baseline_tasks)
        for cases in baseline_results:
            all_test_cases.extend(cases)

        # ── Stage 4: Merge & Validate ──
        update_job(job_id, stage="finalizing")
        report = ollama_client.merge_and_validate(all_test_cases, plan)

        update_job(job_id, status="done", stage="done", test_report=report)

    except Exception as e:
        update_job(job_id, status="error", stage="error", error=str(e))


async def run_test_generation(job_id: str, understanding: dict, user_prompt: str, deep: bool):
    """Re-generate test cases with a custom user prompt (uses the same multi-stage pipeline)."""
    try:
        # ── Stage 2: Plan ──
        update_job(job_id, status="running", stage="planning_tests")
        plan = await ollama_client.plan_test_cases(understanding, user_prompt, deep=deep)

        if "error" in plan:
            update_job(job_id, status="error", stage="error", error=plan["error"])
            return

        update_job(job_id, test_plan=plan)

        # ── Stage 3: Generate per-feature ──
        update_job(job_id, stage="generating_tests")

        product_context = {
            "product_type": understanding.get("product_type", "Unknown"),
            "purpose": understanding.get("purpose", "Unknown"),
        }

        all_test_cases = []

        feature_plans = plan.get("plan", [])
        total_features = len(feature_plans)
        completed_features = 0
        sem = asyncio.Semaphore(5)

        async def generate_feature_with_progress(fp):
            nonlocal completed_features
            async with sem:
                cases = await ollama_client.generate_feature_test_cases(product_context, fp, deep=deep)
            completed_features += 1
            update_job(
                job_id,
                stage="generating_tests",
                generation_progress={
                    "current": completed_features,
                    "total": total_features,
                    "feature": fp.get("feature_name", "Unknown"),
                }
            )
            return cases

        feature_tasks = [generate_feature_with_progress(fp) for fp in feature_plans]
        feature_results = await asyncio.gather(*feature_tasks)
        for cases in feature_results:
            all_test_cases.extend(cases)

        baseline_plans = plan.get("baseline", [])
        
        async def generate_baseline_with_sem(bp):
            async with sem:
                return await ollama_client.generate_baseline_test_cases(product_context, bp, deep=deep)
                
        baseline_tasks = [generate_baseline_with_sem(bp) for bp in baseline_plans]
        baseline_results = await asyncio.gather(*baseline_tasks)
        for cases in baseline_results:
            all_test_cases.extend(cases)

        # ── Stage 4: Merge ──
        update_job(job_id, stage="finalizing")
        report = ollama_client.merge_and_validate(all_test_cases, plan)

        update_job(job_id, status="done", stage="done", test_report=report)

    except Exception as e:
        update_job(job_id, status="error", stage="error", error=str(e))
