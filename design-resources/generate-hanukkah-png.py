"""
Generates assets/hanukkah.png - the Hanukkah spinner template (נ ג ה פ).

    python3 design-resources/generate-hanukkah-png.py

Uses the same layout as the other templates (see numbers.png / DiceLayout in src/edit-dice.tsx):
960x960, faces of 240px. The spinner uses faces 0-3; faces 4-5 are left empty.
"""
import os
from PIL import Image, ImageDraw, ImageFont

Size = 960
Cell = Size // 4
FaceBg = (0xE7, 0xE7, 0xE7)
# face index -> cell position (in cells) - same as DiceLayout
Cells = [(1.5, 0), (0.5, 1), (1.5, 1), (2.5, 1), (1.5, 2), (1.5, 3)]
Letters = ["נ", "ג", "ה", "פ"]

font = ImageFont.truetype("/System/Library/Fonts/ArialHB.ttc", 200, index=1)  # Arial Hebrew Bold

img = Image.new("RGB", (Size, Size), "white")
draw = ImageDraw.Draw(img)
for i, (cx, cy) in enumerate(Cells):
    x, y = int(cx * Cell), int(cy * Cell)
    draw.rectangle([x, y, x + Cell - 1, y + Cell - 1], fill=FaceBg)
    if i < len(Letters):
        # center the glyph's ink box in the face
        l, t, r, b = draw.textbbox((0, 0), Letters[i], font=font)
        draw.text((x + (Cell - (r - l)) / 2 - l, y + (Cell - (b - t)) / 2 - t), Letters[i], font=font, fill="black")

out = os.path.join(os.path.dirname(__file__), "../assets/hanukkah.png")
img.save(out)
print("written", out)
