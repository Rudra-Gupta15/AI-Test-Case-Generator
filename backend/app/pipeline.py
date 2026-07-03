"""
Multi-stage pipeline:
  Stage 1 (analyze):   parse BRD/FSD/Figma/images → understanding summary
  Stage 2 (plan):      understanding → deterministic test plan with exact counts
  Stage 3 (generate):  per-feature LLM calls → test cases for each feature + baselines
  Stage 4 (merge):     combine, renumber IDs, validate completeness

Split into stages so the UI can show progress at each checkpoint.

node_id (optional):
  When provided, the final test_report is ALSO written into that TreeNode's data
  field in the database.  All upstream logic (doc parsing, Ollama calls) is
  identical — only the write target changes.
"""
import asyncio
from typing import Optional

from app.jobs import update_job
from app import doc_parser, figma_client, ollama_client


def _persist_to_node(node_id: str, understanding: dict, report: dict) -> None:
    """Write analysis output to TreeNode.data in the DB (best-effort, non-blocking)."""
    try:
        from app.database import SessionLocal
        from app.models import TreeNode

        db = SessionLocal()
        try:
            node = db.query(TreeNode).filter(TreeNode.id == node_id).first()
            if node:
                node.data = {
                    "understanding": understanding,
                    "test_report": report,
                }
                db.commit()
        finally:
            db.close()
    except Exception as exc:
        # Non-fatal — job already has the data in memory
        print(f"[pipeline] Warning: failed to persist to node {node_id}: {exc}")


async def run_analysis(
    job_id: str,
    brd_path: Optional[str],
    fsd_path: Optional[str],
    image_paths: list[str],
    figma_url: Optional[str],
    figma_token: Optional[str],
    project_url: Optional[str],
    deep: bool,
    node_id: Optional[str] = None,   # ← NEW
):
    try:
        # ── Stage 1: Parse documents ──
        update_job(job_id, status="running", stage="parsing_documents")

        brd_text = doc_parser.truncate_for_llm(doc_parser.extract_text(brd_path)) if brd_path else ""
        fsd_text = doc_parser.truncate_for_llm(doc_parser.extract_text(fsd_path)) if fsd_path else ""

        update_job(job_id, stage="fetching_figma")
        figma_screens = []
        if figma_url and figma_token:
            try:
                file_key, node_id_figma = figma_client.parse_figma_url(figma_url)
                summary = await figma_client.get_file_summary(file_key, figma_token, node_id_figma)
                figma_screens = summary["screens"]
            except Exception as e:
                figma_screens = [{"name": f"[Figma fetch failed: {str(e)[:100]}]", "type": "ERROR"}]

        project_text = ""
        if project_url:
            update_job(job_id, status="running", stage="parsing_documents")
            try:
                import requests
                jina_url = f"https://r.jina.ai/{project_url.strip()}"
                print(f"======== WEB SCRAPER TRIGGERED: {jina_url} ========")
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                resp = requests.get(jina_url, headers=headers, timeout=25)
                print(f"======== SCRAPER STATUS CODE: {resp.status_code} ========")
                if resp.status_code == 200:
                    project_text = doc_parser.truncate_for_llm(resp.text)
                    print(f"======== SCRAPER SUCCESS: FETCHED {len(resp.text)} chars, TRUNCATED TO {len(project_text)} chars ========")
                else:
                    project_text = f"[Failed to scrape {project_url}: HTTP {resp.status_code} - {resp.text[:100]}]"
            except Exception as e:
                project_text = f"[Failed to scrape {project_url}: {str(e)}]"
                print(f"======== SCRAPER EXCEPTION: {str(e)} ========")

        # ── Stage 1b: LLM Understanding ──
        update_job(job_id, stage="understanding")
        understanding = await ollama_client.understand(
            brd_text, fsd_text, figma_screens, image_paths, project_text, deep=deep
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
                },
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

        # ── Write to TreeNode if node_id provided ──
        if node_id:
            _persist_to_node(node_id, understanding, report)

    except Exception as e:
        update_job(job_id, status="error", stage="error", error=str(e))


async def run_test_generation(
    job_id: str,
    understanding: dict,
    user_prompt: str,
    deep: bool,
    node_id: Optional[str] = None,   # ← NEW
):
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
                },
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

        # ── Write to TreeNode if node_id provided ──
        if node_id:
            _persist_to_node(node_id, understanding, report)

    except Exception as e:
        update_job(job_id, status="error", stage="error", error=str(e))
