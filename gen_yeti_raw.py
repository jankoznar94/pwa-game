#!/usr/bin/env python3
"""Generate Yeti — no gamma correction, keep natural brightness."""

import json, base64, subprocess, os
from PIL import Image

prompt = """Create a monster face portrait in the style of Warcraft 3 unit icons.

STYLE:
- Painted/illustrated fantasy art style, like Warcraft 3 portrait icons
- SQUARE format, exactly 1:1 aspect ratio
- Close-up of the face/head, centered in the frame
- Dark/black background
- Dramatic lighting from one side (top-left or top-right)
- Rich colors, sharp details, slightly gritty texture
- Focus on the face — show expression, eyes, mouth, distinctive features
- No UI elements, no frames, no text
- CRITICAL: The image MUST have NO white border, NO white padding, NO white frame of any kind. The artwork must go edge to edge — pure black background touching all four sides. Absolutely no white margin around the image.
- The monster should look straight at the viewer or slightly angled
- The face should fill most of the frame — minimal empty space around it

COLOR PALETTE: SNOW — white fur, grey skin, dark brown eyes, charcoal shadows, pale grey tones

MONSTER: YETI (Abominable Snowman) — massive yeti face, thick white fur covering the head and shoulders, pale grey skin visible on the face, two small dark brown eyes, a wide flat nose, slightly open mouth showing sharp teeth, fur is thick and matted like a mountain gorilla, ears hidden under fur, a brutal and savage expression, like the legendary abominable snowman of the Himalayas"""

payload = {
    "model": "Flux-2-Klein-9B-GGUF",
    "prompt": prompt,
    "n": 1,
    "size": "256x256",
    "steps": 40,
    "cfg_scale": 1.0
}

r = subprocess.run(["curl", "-s", "--max-time", "600",
    "-X", "POST", "http://172.23.128.1:13305/v1/images/generations",
    "-H", "Content-Type: application/json",
    "-d", json.dumps(payload),
    "--output", "/tmp/yeti_raw.json"], capture_output=True, text=True, timeout=620)

with open("/tmp/yeti_raw.json") as f:
    data = json.load(f)

b64 = data["data"][0]["b64_json"]
img_bytes = base64.b64decode(b64)
with open("/tmp/yeti_raw.png", "wb") as f:
    f.write(img_bytes)
print(f"Generated: {len(img_bytes)} bytes")

img = Image.open("/tmp/yeti_raw.png")
print(f"Mode: {img.mode}, Size: {img.size}")

# NO gamma correction — keep natural brightness
out = "/home/martin_fabian/pwa-game/dist/assets/monsters/frost_giant.png"
if img.mode == "RGBA":
    img = img.convert("RGB")
img.save(out, "PNG")

subprocess.run(["/usr/bin/pngquant", "--quality=60-80", "--speed=1", "--force",
    "--output", out, "--", out], capture_output=True, timeout=30)

size_kb = os.path.getsize(out) / 1024
print(f"Final: {size_kb:.1f} KB (no gamma correction)")
print("DONE")
