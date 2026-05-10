#!/usr/bin/env python3
"""
NotebookLM 视频深度挖掘器 - 使用 CDP 认证 + curl_cffi TLS 模拟
渐进式多轮提问，生成多章节教程
"""
import asyncio, json, re, sys, time
from pathlib import Path
from curl_cffi.requests import AsyncSession

NOTEBOOKLM_URL = "https://notebooklm.google.com"
RPC_URL = f"{NOTEBOOKLM_URL}/_/BatchexecuteRpc"

def load_auth():
    """从 CDP Playwright storage state 加载认证"""
    state_path = Path.home() / ".notebooklm/profiles/default/storage_state.json"
    if not state_path.exists():
        raise FileNotFoundError(f"No storage state at {state_path}. Run: notebooklm login --cdp-port 9223")
    
    state = json.loads(state_path.read_text())
    cookies = {}
    for c in state["cookies"]:
        domain = c.get("domain", "")
        name = c.get("name", "")
        value = c.get("value", "")
        if name and value and ("google" in domain.lower()):
            cookies[name] = value
    return cookies

async def rpc_call(session, notebook_id, method, args):
    """Make a NotebookLM RPC call"""
    req_id = int(time.time() * 1000) % 1000000
    payload = json.dumps({
        "method": method,
        "args": args
    })
    
    params = {
        "rpcids": f"{method}-{req_id}",
        "f.req": json.dumps([[payload]]),
        "bl": "boq_notebooklmfrontendserver_20250421.00_p0",
        "soc-app": "165",
        "soc-platform": "1",
        "soc-device": "1",
        "rt": "c",
    }
    
    resp = await session.post(RPC_URL, params=params, data={"f.req": json.dumps([[payload]])})
    return resp

async def fetch_csrf(session):
    """Fetch CSRF token from NotebookLM homepage"""
    resp = await session.get(f"{NOTEBOOKLM_URL}/")
    html = resp.text
    csrf = re.search(r'"SNlM0e"\s*:\s*"([^"]+)"', html)
    session_id = re.search(r'"FdrFJe"\s*:\s*"([^"]+)"', html)
    
    if not csrf or not session_id:
        raise ValueError(f"Cannot find tokens. URL: {resp.url}")
    return csrf.group(1), session_id.group(1)

def build_queryparams(csrf_token, session_id):
    """Build URL query parameters"""
    return f"authuser=0&soc-platform=1&soc-app=165&soc-device=1&rt=c&csrf={csrf_token}&session={session_id}"

def parse_rpc_response(text):
    """Parse NotebookLM batch execute RPC response"""
    # Strip XSS prefix
    text = text.strip()
    if text.startswith(")]}'"):
        text = text[4:]
    lines = text.split("\n")
    results = []
    for line in lines:
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            if isinstance(data, list) and len(data) > 0:
                inner = data[0]
                if isinstance(inner, list) and len(inner) > 0:
                    item = inner[0]
                    if isinstance(item, list) and len(item) > 2:
                        encoded = item[2]
                        if isinstance(encoded, str):
                            results.append(json.loads(encoded))
        except (json.JSONDecodeError, IndexError, TypeError):
            continue
    return results

# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
async def main():
    output_dir = Path(r"E:\projectHome\youtube-search\output\eA9Zf2-qYYM")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    cookies = load_auth()
    cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
    
    session = AsyncSession(impersonate="chrome124", headers={
        "Cookie": cookie_header,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    })
    
    try:
        # Step 1: Get CSRF token
        print("[1] Fetching auth tokens...")
        csrf, sess_id = fetch_csrf(session)
        print(f"    CSRF: {csrf[:20]}..., Session: {sess_id[:10]}...")
        
        # Step 2: Create notebook
        print("[2] Creating notebook...")
        # TODO: Implement notebook creation via RPC
        
        # Step 3: Ask about the video
        print("[3] Testing ask about video...")
        
        # First let's just verify we can access the homepage
        resp = await session.get(f"{NOTEBOOKLM_URL}/")
        print(f"    Homepage status: {resp.status_code}, URL: {str(resp.url)[:80]}")
        
        if "accounts.google.com" in str(resp.url):
            print("    AUTH FAILED!")
        else:
            print("    AUTH OK!")
            
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(main())
