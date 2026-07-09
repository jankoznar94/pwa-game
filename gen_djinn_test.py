#!/usr/bin/env python3
"""Regenerate Djinn with the exact approved prompt to test Flux quality."""

import json, base64, subprocess, os, math, statistics
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

COLOR PALETTE: POUŠŤ — sandy yellows, ochre, amber eyes, smoky blue-white lower body, gold accents

MONSTER: DJINN (Genie) — classic genie from a magic lamp, wearing a turban with a jewel, mystical blue-white smoky lower body fading into mist, glowing amber eyes, sharp angular face, gold earring, mischievous but menacing expression, wisps of magical smoke around the head, no mouth visible, ethereal and powerful"""

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
    "--output", "/tmp/djinn_test.json"], capture_output=True, text=True, timeout=620)

with open("/tmp/djinn_test.json") as f:
    data = json.load(f)

b64 = data["data"][0]["b64_json"]
img_bytes = base64.b64decode(b64)
with open("/tmp/djinn_test.png", "wb") as f:
    f.write(img_bytes)
print(f"Generated: {len(img_bytes)} bytes")

img = Image.open("/tmp/djinn_test.png")
print(f"Mode: {img.mode}, Size: {img.size}")

if img.mode == "RGBA":
    img = img.convert("RGB")

gray = img.convert("L")
pixels = list(gray.getdata())
avg = statistics.mean(pixels)
print(f"Brightness: {avg:.1f}/255")

target = 38.0
gamma = math.log(target/255) / math.log(avg/255)
print(f"Gamma: {gamma:.3f}")

img_gamma = img.point(lambda x: int(255 * ((x/255) ** gamma)))
gray2 = img_gamma.convert("L")
new_avg = statistics.mean(list(gray2.getdata()))
print(f"After gamma: {new_avg:.1f}/255")

if abs(new_avg - target) > 3.0:
    gamma2 = math.log(target/255) / math.log(new_avg/255)
    print(f"2nd pass gamma: {gamma2:.3f}")
    img_gamma = img_gamma.point(lambda x: int(255 * ((x/255) ** gamma2)))
    gray3 = img_gamma.convert("L")
    new_avg = statistics.mean(list(gray3.getdata()))
    print(f"After 2nd pass: {new_avg:.1f}/255")

out = "/tmp/djinn_test_final.png"
img_gamma.save(out, "PNG")

subprocess.run(["/usr/bin/pngquant", "--quality=60-80", "--speed=1", "--force",
    "--output", out, "--", out], capture_output=True, timeout=30)

size_kb = os.path.getsize(out) / 1024
print(f"Final: {size_kb:.1f} KB")
print("DONE")
