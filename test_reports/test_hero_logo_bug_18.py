import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright


BASE_URL = "https://ar360-shop.preview.emergentagent.com"
ROUTES = [
    "/shop",
    "/membership",
    "/doctors",
    "/affiliates",
    "/wholesale",
    "/recovery-services",
    "/contact",
]


async def collect_hero_logo(page, width: int, height: int = 844):
    await page.set_viewport_size({"width": width, "height": height})
    await page.goto(BASE_URL + "/", wait_until="domcontentloaded", timeout=45000)
    await page.wait_for_timeout(1200)
    await page.wait_for_selector('section img[alt="Active Recovery 360"]', timeout=15000)
    return await page.evaluate(
        """
        () => {
          const candidates = Array.from(document.querySelectorAll('section img[alt="Active Recovery 360"]'));
          const rows = candidates.map((img) => {
            const r = img.getBoundingClientRect();
            const p = img.parentElement;
            const pcs = p ? getComputedStyle(p) : null;
            const ics = getComputedStyle(img);
            return {
              src: img.currentSrc || img.src,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              clientHeight: img.clientHeight,
              rectHeight: r.height,
              className: img.getAttribute('class') || '',
              parentClassName: p ? (p.getAttribute('class') || '') : null,
              parentBgColor: pcs ? pcs.backgroundColor : null,
              parentTag: p ? p.tagName.toLowerCase() : null,
              parentStyle: p ? (p.getAttribute('style') || '') : null,
              filter: ics.filter
            };
          }).sort((a, b) => b.clientHeight - a.clientHeight);
          return rows[0] || null;
        }
        """
    )


async def sample_logo_palette(page):
    return await page.evaluate(
        """
        async () => {
          const imgs = Array.from(document.querySelectorAll('section img[alt="Active Recovery 360"]'))
            .sort((a, b) => b.clientHeight - a.clientHeight);
          const img = imgs[0];
          if (!img) return { error: 'logo image not found' };
          if (!img.complete) await img.decode();
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let nonTransparent = 0, white = 0, darkNavy = 0, mediumBlue = 0;
          const histogram = new Map();
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a <= 200) continue;
            nonTransparent++;
            if (r > 230 && g > 230 && b > 230) white++;
            if (r <= 60 && g >= 20 && g <= 95 && b >= 50 && b <= 135) darkNavy++;
            if (r <= 115 && g >= 85 && g <= 170 && b >= 125 && b <= 220) mediumBlue++;
            const key = `${Math.floor(r / 16) * 16},${Math.floor(g / 16) * 16},${Math.floor(b / 16) * 16}`;
            histogram.set(key, (histogram.get(key) || 0) + 1);
          }
          const topQuantized = Array.from(histogram.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([rgb, count]) => ({ rgb, count }));
          return { nonTransparent, white, darkNavy, mediumBlue, topQuantized };
        }
        """
    )


async def main():
    results = {
        "base_url": BASE_URL,
        "home_console_errors": [],
        "viewport_checks": {},
        "palette": None,
        "route_checks": [],
        "assertions": [],
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        home_console_errors = []
        page.on("console", lambda msg: home_console_errors.append(f"{msg.type}: {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: home_console_errors.append(f"pageerror: {exc}"))

        viewports = [(375, 160), (800, 256), (1280, 288)]
        for width, expected_height in viewports:
            info = await collect_hero_logo(page, width)
            results["viewport_checks"][str(width)] = info
            height_ok = info is not None and abs(info["clientHeight"] - expected_height) <= 2
            parent_class = info.get("parentClassName") if info else ""
            parent_bg_class = bool(re.search(r"(^|\\s)bg-", parent_class or ""))
            parent_transparent = info is not None and info.get("parentBgColor") in ("rgba(0, 0, 0, 0)", "transparent")
            filter_ok = info is not None and "drop-shadow" in (info.get("filter") or "")
            src_ok = info is not None and "active-recovery-360-logo" in (info.get("src") or "")
            natural_ok = info is not None and info.get("naturalWidth") == 1071

            results["assertions"].extend([
                {"name": f"height_{width}", "passed": height_ok, "actual": info.get("clientHeight") if info else None, "expected": expected_height},
                {"name": f"parent_no_bg_class_{width}", "passed": not parent_bg_class, "actual": parent_class},
                {"name": f"parent_transparent_{width}", "passed": parent_transparent, "actual": info.get("parentBgColor") if info else None},
                {"name": f"drop_shadow_{width}", "passed": filter_ok, "actual": info.get("filter") if info else None},
                {"name": f"src_{width}", "passed": src_ok, "actual": info.get("src") if info else None},
                {"name": f"natural_width_{width}", "passed": natural_ok, "actual": info.get("naturalWidth") if info else None},
            ])

        results["palette"] = await sample_logo_palette(page)
        palette = results["palette"] or {}
        results["assertions"].extend([
            {"name": "palette_dark_navy_present", "passed": palette.get("darkNavy", 0) > 1000, "actual": palette.get("darkNavy")},
            {"name": "palette_medium_blue_present", "passed": palette.get("mediumBlue", 0) > 1000, "actual": palette.get("mediumBlue")},
            {"name": "palette_not_white_logo", "passed": palette.get("white", 999999) < 100, "actual": palette.get("white")},
        ])

        results["home_console_errors"] = home_console_errors
        results["assertions"].append({"name": "home_no_console_errors", "passed": len(home_console_errors) == 0, "actual": home_console_errors})

        for route in ROUTES:
            route_page = await browser.new_page()
            try:
                response = await route_page.goto(BASE_URL + route, wait_until="domcontentloaded", timeout=45000)
                await route_page.wait_for_timeout(800)
                body_text = (await route_page.locator("body").inner_text(timeout=10000)).strip()
                status = response.status if response else None
                loaded = (status is None or status < 400) and len(body_text) > 50 and "404" not in body_text[:300]
                results["route_checks"].append({"route": route, "status": status, "loaded": loaded, "body_excerpt": body_text[:120]})
                results["assertions"].append({"name": f"route_loads_{route}", "passed": loaded, "actual": {"status": status, "body_len": len(body_text)}})
            except Exception as exc:
                results["route_checks"].append({"route": route, "loaded": False, "error": str(exc)})
                results["assertions"].append({"name": f"route_loads_{route}", "passed": False, "actual": str(exc)})
            finally:
                await route_page.close()

        await browser.close()

    results["passed"] = all(item["passed"] for item in results["assertions"])
    output_path = Path("/app/test_reports/hero_logo_bug_18_results.json")
    output_path.write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    asyncio.run(main())