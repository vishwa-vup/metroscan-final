"""Synthetic permission-free label images for tests/demo (we own these pixels)."""

from io import BytesIO

from PIL import Image, ImageDraw, ImageFont

LINES = [
    "FreshFarm Foods Pvt Ltd",
    "Plot 12, MIDC Area, Pune 411026",
    "Net Qty: 500 g",
    "MRP: Rs 99.00 (incl. of all taxes)",
    "Mfg: 03/2025",
    "Consumer Care: 1800-123-456, care@freshfarm.in",
]


def make_label_png(lines: list[str] | None = None, size=(1200, 900)) -> bytes:
    img = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=44)
    except TypeError:
        font = ImageFont.load_default()
    draw.rectangle([20, 20, size[0] - 20, size[1] - 20], outline="black", width=4)
    y = 80
    for line in lines or LINES:
        draw.text((70, y), line, fill="black", font=font)
        y += 110
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
