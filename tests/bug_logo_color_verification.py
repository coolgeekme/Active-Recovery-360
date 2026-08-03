"""Focused verification for AR360 hero logo color restoration bug.

This file documents the focused browser checks run by the testing agent and
provides a standalone asset-level regression check that can run in this
container without Playwright installed:
- natural PNG dimensions are 1071x384
- canvas pixels include navy and medium-blue logo colors, not pure white

The UI-specific checks were executed with the MCP browser automation runner:
- home hero logo exists in the section, not the header
- logo is rendered in the white translucent card
- desktop/mobile rendered heights match Tailwind classes
- public routes smoke-load without console/page errors

Run standalone asset check with: python3 /app/tests/bug_logo_color_verification.py
"""

from pathlib import Path
from PIL import Image


ASSET = Path("/app/frontend/src/assets/active-recovery-360-logo.png")


def main():
    im = Image.open(ASSET).convert("RGBA")
    assert im.size == (1071, 384), im.size

    navy_count = medium_blue_count = white_opaque_count = opaque_count = 0
    navy_sample = medium_sample = None
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a > 150:
                opaque_count += 1
                if r > 240 and g > 240 and b > 240:
                    white_opaque_count += 1
                if 10 <= r <= 50 and 30 <= g <= 75 and 60 <= b <= 120:
                    navy_count += 1
                    navy_sample = navy_sample or (x, y, (r, g, b, a))
                if 50 <= r <= 110 and 100 <= g <= 170 and 130 <= b <= 210:
                    medium_blue_count += 1
                    medium_sample = medium_sample or (x, y, (r, g, b, a))

    result = {
        "asset": str(ASSET),
        "size": im.size,
        "opaque_count": opaque_count,
        "navy_count": navy_count,
        "navy_sample": navy_sample,
        "medium_blue_count": medium_blue_count,
        "medium_sample": medium_sample,
        "white_opaque_count": white_opaque_count,
    }
    assert navy_count > 1000, result
    assert medium_blue_count > 1000, result
    assert white_opaque_count <= opaque_count * 0.05, result
    print("Asset-level logo color regression check passed:", result)


if __name__ == "__main__":
    main()