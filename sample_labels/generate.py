"""Generate the 4 permissioned demo labels (Phase 9). We own every pixel: synthetic
PIL renderings, no brands, no personal data. Run: python sample_labels/generate.py"""

from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent

COMPLIANT = [
    "Mfd by: Demo Foods Co",
    "Plot 7, Market Road, Pune 411001",
    "Net Qty: 500 g",
    "MRP Rs 149.00 (incl. of all taxes)",
    "Mfg 01/2026",
    "Consumer Care 1800-111-222, hello@demofoods.example",
]

MISSING_MRP = [ln for ln in COMPLIANT if not ln.startswith("MRP")]  # R4 → could-not-verify


def render(lines, font_size=44, size=(1200, 900)):
    img = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=font_size)
    except TypeError:
        font = ImageFont.load_default()
    draw.rectangle([20, 20, size[0] - 20, size[1] - 20], outline="black", width=4)
    y = 80
    for line in lines:
        draw.text((70, y), line, fill="black", font=font)
        y += max(int(font_size * 2.2), 40)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    render(COMPLIANT).save(OUT / "label-compliant.png")
    render(MISSING_MRP).save(OUT / "label-missing-mrp.png")
    render(COMPLIANT, font_size=20).save(OUT / "label-small-text.png")  # readability concern
    sharp = cv2.cvtColor(np.array(render(COMPLIANT)), cv2.COLOR_RGB2BGR)
    cv2.imwrite(str(OUT / "label-blurry.png"), cv2.GaussianBlur(sharp, (25, 25), 0))
    for p in sorted(OUT.glob("label-*.png")):
        print(p.name, p.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
