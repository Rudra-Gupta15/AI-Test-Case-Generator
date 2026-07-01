"""
Fetches a lightweight structural summary of a Figma file/frame —
just enough for the LLM to understand what screens/flows exist.
Reuses the same URL-parsing approach as the visual-QA project.
"""
import re
import httpx
from app.config import FIGMA_API_BASE


class FigmaError(Exception):
    pass


def parse_figma_url(url: str):
    file_match = re.search(r"figma\.com/(?:file|design)/([a-zA-Z0-9]+)", url)
    if not file_match:
        raise FigmaError("Could not find a Figma file key in that URL.")
    file_key = file_match.group(1)

    node_match = re.search(r"node-id=([^&]+)", url)
    node_id = None
    if node_match:
        node_id = node_match.group(1).replace("%3A", ":").replace("-", ":")

    return file_key, node_id


async def get_file_summary(file_key: str, token: str, node_id: str | None = None):
    """
    Returns a simplified list of top-level frames/pages/screens with their names,
    so the LLM can reason about which screens exist without needing full style data.
    """
    if not token:
        raise FigmaError("Missing Figma API token.")

    headers = {"X-Figma-Token": token}

    async with httpx.AsyncClient(timeout=30) as client:
        if node_id:
            url = f"{FIGMA_API_BASE}/files/{file_key}/nodes"
            resp = await client.get(url, params={"ids": node_id}, headers=headers)
        else:
            url = f"{FIGMA_API_BASE}/files/{file_key}"
            resp = await client.get(url, headers=headers)

        if resp.status_code != 200:
            raise FigmaError(f"Figma API error {resp.status_code}: {resp.text[:200]}")
        data = resp.json()

    screens = []
    if node_id:
        for k, v in data.get("nodes", {}).items():
            doc = v.get("document", {})
            screens.extend(_walk_top_level(doc))
    else:
        document = data.get("document", {})
        for page in document.get("children", []):
            for frame in page.get("children", []):
                screens.append({
                    "name": frame.get("name"),
                    "type": frame.get("type"),
                    "page": page.get("name"),
                })

    return {
        "file_name": data.get("name", "Untitled"),
        "screens": screens,
    }


def _walk_top_level(node):
    results = []
    for child in node.get("children", []) or []:
        if child.get("type") in ("FRAME", "COMPONENT", "INSTANCE"):
            results.append({"name": child.get("name"), "type": child.get("type")})
        results.extend(_walk_top_level(child))
    return results
