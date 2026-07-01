"""
Two-stage pipeline:
  Stage A (analyze): parse BRD/FSD/Figma/images -> understanding summary
  Stage B (generate): understanding + user prompt -> test case report
Split into two so the UI can show the understanding summary as a checkpoint
before generating test cases.
"""
from app.jobs import update_job
from app import doc_parser, figma_client, ollama_client


async def run_analysis(job_id: str, brd_path: str | None, fsd_path: str | None,
                        image_paths: list[str], figma_url: str | None,
                        figma_token: str | None, deep: bool):
    try:
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

        update_job(job_id, stage="understanding")
        understanding = await ollama_client.understand(
            brd_text, fsd_text, figma_screens, image_paths, deep=deep
        )

        # Automatically generate test cases with the user's prompt
        update_job(job_id, stage="generating_tests", understanding=understanding)
        
        default_prompt = (
            "Generate test cases for each feature in the FSD, covering valid inputs, "
            "invalid inputs, and edge cases listed under each feature's validation rules. "
            "For each test case, include: test ID, feature, precondition, steps, "
            "input data, expected result, and pass/fail criteria. Flag any FSD behavior "
            "that has no corresponding test case, and flag any validation rule from the "
            "field tables that isn't testable as written (e.g. missing units, ambiguous limits)."
        )
        
        report = await ollama_client.generate_test_cases(understanding, default_prompt, deep=deep)
        if "error" in report:
            update_job(job_id, status="error", stage="error", error=report["error"])
        else:
            update_job(job_id, status="done", stage="done", test_report=report)

    except Exception as e:
        update_job(job_id, status="error", stage="error", error=str(e))


async def run_test_generation(job_id: str, understanding: dict, user_prompt: str, deep: bool):
    try:
        update_job(job_id, status="running", stage="generating_tests")
        report = await ollama_client.generate_test_cases(understanding, user_prompt, deep=deep)
        if "error" in report:
            update_job(job_id, status="error", stage="error", error=report["error"])
        else:
            update_job(job_id, status="done", stage="done", test_report=report)
    except Exception as e:
        update_job(job_id, status="error", stage="error", error=str(e))
