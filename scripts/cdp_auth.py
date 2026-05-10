import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9223")
        ctx = browser.contexts[0]
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await page.goto("https://notebooklm.google.com/", wait_until="domcontentloaded", timeout=15000)
        print(f"URL: {page.url[:120]}")

        if "accounts.google.com" in page.url:
            print("NOT LOGGED IN - redirected to login")
            return

        print("LOGGED IN! Extracting storage state...")
        state = await ctx.storage_state()
        out = r"C:\Users\yang0\.notebooklm\profiles\default\storage_state.json"
        with open(out, "w") as f:
            json.dump(state, f, indent=2)

        sid = [c for c in state["cookies"] if c["name"] == "SID"]
        print(f"Cookies: {len(state['cookies'])}, SID: {len(sid)}")
        if sid:
            print(f"SID domain: {sid[0]['domain']}, expires: {sid[0]['expires']}")

asyncio.run(main())
