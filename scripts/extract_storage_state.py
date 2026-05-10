#!/usr/bin/env python3
"""Extract Google cookies via CDP → Playwright storage_state.json for notebooklm."""
import argparse, json, sys, time, urllib.request

def check_cdp(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=5) as r:
        data = json.loads(r.read())
        return data.get("Browser", "unknown")

def get_page_ws_url(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=5) as r:
        targets = json.loads(r.read())
    for t in targets:
        if t.get("type") == "page":
            return t.get("webSocketDebuggerUrl")
    return None

def extract_all_cookies(port, domains):
    from websocket import create_connection, WebSocketException
    ws_url = get_page_ws_url(port)
    if not ws_url:
        print("ERROR: No page target")
        sys.exit(1)

    ws = create_connection(ws_url, timeout=10)

    all_cookies = []
    for domain in domains:
        print(f"  Navigating to {domain}...")
        ws.send(json.dumps({"id": 1, "method": "Page.navigate", "params": {"url": f"https://{domain}"}}))
        ws.recv()
        time.sleep(3)

        ws.send(json.dumps({"id": 2, "method": "Network.getCookies", "params": {"urls": [f"https://{domain}", f"https://.{domain}"]}}))
        result = json.loads(ws.recv())
        cookies = result.get("result", {}).get("cookies", [])
        print(f"    Found {len(cookies)} cookies")
        all_cookies.extend(cookies)

    ws.close()
    return all_cookies

def to_playwright_state(cookies):
    pw_cookies = []
    for c in cookies:
        expires = c.get("expires", 0)
        if isinstance(expires, (int, float)) and expires > 1e12:
            expires = int(expires)
        elif isinstance(expires, (int, float)):
            expires = int(time.time() + expires) if expires > 0 else 0
        else:
            expires = int(expires) if expires else 0

        pw_cookies.append({
            "name": c.get("name", ""),
            "value": c.get("value", ""),
            "domain": c.get("domain", ""),
            "path": c.get("path", "/"),
            "expires": expires,
            "httpOnly": c.get("httpOnly", False),
            "secure": c.get("secure", False),
            "sameSite": c.get("sameSite", "None")
        })
    return {"cookies": pw_cookies, "origins": []}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=9223)
    parser.add_argument("--output", "-o", required=True)
    args = parser.parse_args()

    print(f"Checking CDP port {args.port}...")
    browser = check_cdp(args.port)
    print(f"  Browser: {browser}")

    domains = [
        "notebooklm.google.com",
        "accounts.google.com",
        "www.google.com",
    ]
    print("Extracting cookies...")
    cookies = extract_all_cookies(args.port, domains)

    # Deduplicate by domain+name
    seen = {}
    for c in cookies:
        key = (c.get("domain", ""), c.get("name", ""))
        if key not in seen:
            seen[key] = c

    state = to_playwright_state(list(seen.values()))
    
    # Check for SID
    sid = [c for c in state["cookies"] if c["name"] == "SID"]
    domains_found = set(c["domain"] for c in state["cookies"] if "google" in c["domain"])
    print(f"\n  SID cookies: {len(sid)}")
    print(f"  Google domains: {sorted(domains_found)}")
    
    if not sid:
        print("  WARNING: No SID cookie found! Adding from youtube source...")
        # Try to get from youtube domain too
        # (already navigated, but SID might be on .youtube.com)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)
    print(f"\nSaved {len(state['cookies'])} cookies to {args.output}")

if __name__ == "__main__":
    main()
