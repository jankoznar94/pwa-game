#!/usr/bin/env python3
"""Generate 5 amulet icons for Dungeon Recall — WC3 inventory icon style."""

import json, base64, subprocess, os, time
from PIL import Image

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/items"

os.makedirs(OUT_DIR, exist_ok=True)

STYLE = """Create an item icon in the style of Warcraft 3 inventory icons.

STYLE:
- Painted/illustrated fantasy art style, like Warcraft 3 item icons
- SQUARE format, exactly 1:1 aspect ratio
- The item centered in the frame, filling most of the space
- Dark/black background
- Dramatic lighting from one side (top-left)
- Rich colors, sharp details, slightly gritty texture
- No UI elements, no frames, no text
- CRITICAL: The image MUST have NO white border, NO white padding, NO white frame of any kind. The artwork must go edge to edge — pure black background touching all four sides. Absolutely no white margin around the image.
- The item should be shown at a slight angle, as if sitting on a dark surface
- Focus on the item's distinctive shape and material

"""

items = [
    ("amulet_bone.png",
     "COLOR PALETTE: BONE — aged yellowed bone, dark leather cord, iron clasp, worn edges.\nITEM: BONE AMULET — a primitive amulet made from a carved animal tooth, hung on a dark leather cord, the tooth is yellowed with age, wrapped with thin iron wire at the top, crude and tribal, seen from the front hanging"),
    ("amulet_silver.png",
     "COLOR PALETTE: SILVER — polished silver chain, blue moonstone, delicate filigree, dark.\nITEM: SILVER AMULET — a delicate silver amulet on a fine silver chain, a polished blue moonstone set in the center, intricate silver filigree around the stone, elegant and refined, seen from the front hanging"),
    ("amulet_gold.png",
     "COLOR PALETTE: GOLD — pure gold, warm yellow, red garnet, ornate scrollwork.\nITEM: GOLD AMULET — a thick gold amulet on a heavy gold chain, a large faceted red garnet in the center, ornate gold scrollwork and decorative patterns around the gem, substantial and valuable, seen from the front hanging"),
    ("amulet_ruby.png",
     "COLOR PALETTE: RUBY — gold setting, deep red ruby, diamond accents, royal.\nITEM: RUBY AMULET — an elaborate gold amulet set with a large deep red ruby, the ruby is faceted and sparkles, intricate gold filigree, small diamond chips surrounding the ruby, fit for royalty, seen from the front hanging"),
    ("amulet_arcane.png",
     "COLOR PALETTE: ARCANE — dark mithril chain, deep purple amethyst, glowing runes, starry.\nITEM: ARCANE AMULET — a mysterious amulet on a dark mithril chain, a large deep purple amethyst crystal in the center, glowing arcane runes carved into the metal setting, faint magical aura around the gem, legendary and powerful, seen from the front hanging"),
]

def generate(filename, desc):
    print(f"\n=== Generating {filename} ===")
    prompt = STYLE + desc
    payload = {
        "model": "Flux-2-Klein-9B-GGUF",
        "prompt": prompt,
        "n": 1,
        "size": "256x256",
        "steps": 40,
        "cfg_scale": 1.0
    }
    r = subprocess.run(["curl", "-s", "--max-time", "600",
        "-X", "POST", LEMONADE,
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload),
        "--output", f"/tmp/{filename}.json"], capture_output=True, text=True, timeout=620)
    if r.returncode != 0:
        print(f"  ERROR: curl failed: {r.stderr}")
        return False
    with open(f"/tmp/{filename}.json") as f:
        data = json.load(f)
    if "data" not in data or not data["data"]:
        print(f"  ERROR: bad response: {data}")
        return False
    b64 = data["data"][0]["b64_json"]
    img_bytes = base64.b64decode(b64)
    with open(f"/tmp/{filename}", "wb") as f:
        f.write(img_bytes)
    print(f"  Generated: {len(img_bytes)} bytes")

    img = Image.open(f"/tmp/{filename}")
    if img.mode == "RGBA":
        img = img.convert("RGB")

    out = os.path.join(OUT_DIR, filename)
    img.save(out, "PNG")

    subprocess.run(["/usr/bin/pngquant", "--quality=60-80", "--speed=1", "--force",
        "--output", out, "--", out], capture_output=True, timeout=30)
    size_kb = os.path.getsize(out) / 1024
    print(f"  Saved: {size_kb:.1f} KB")
    return True

for filename, desc in items:
    success = generate(filename, desc)
    if not success:
        print(f"  FAILED: {filename}")
    time.sleep(2)

print("\n=== DONE ===")
for filename, _ in items:
    path = os.path.join(OUT_DIR, filename)
    if os.path.exists(path):
        print(f"  {filename}: {os.path.getsize(path)/1024:.1f} KB")
    else:
        print(f"  {filename}: MISSING!")
