#!/usr/bin/env python3
"""Generate 4 dungeon lock icons with transparent background via Lemonade SDXL-Turbo."""
import json, base64, sys, time, os
from io import BytesIO
from PIL import Image
import requests

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/locks"

os.makedirs(OUT_DIR, exist_ok=True)

LOCKS = [
    {
        "file": "lock_desert.png",
        "prompt": "ancient egyptian golden lock icon, intricate pharaonic design, scarab beetle motif, sandstone and gold colors, sharp details, game icon, isolated on solid black background, no shadows, no background elements, centered composition"
    },
    {
        "file": "lock_undead.png",
        "prompt": "bone skull lock icon, necromantic dark design, iron and bone, skull motif with spikes, dark grey and black colors, sharp details, game icon, isolated on solid black background, no shadows, no background elements, centered composition"
    },
    {
        "file": "lock_hell.png",
        "prompt": "demonic fiery lock icon, lava and obsidian, devil face shape, glowing red cracks, horns, sharp details, game icon, isolated on solid black background, no shadows, no background elements, centered composition"
    },
    {
        "file": "lock_frost.png",
        "prompt": "frozen ice lock icon, crystalline ice and frost, sharp ice shards, pale blue and white colors, sharp details, game icon, isolated on solid black background, no shadows, no background elements, centered composition"
    }
]

def remove_black_bg(img, threshold=30):
    """Remove near-black pixels and make them transparent."""
    img = img.convert("RGBA")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if r < threshold and g < threshold and b < threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return img

for lock in LOCKS:
    out_path = os.path.join(OUT_DIR, lock["file"])
    print(f"Generating {lock['file']}...")
    
    resp = requests.post(LEMONADE, json={
        "model": "SDXL-Turbo",
        "prompt": lock["prompt"],
        "n": 1,
        "size": "256x256",
        "steps": 4
    }, timeout=120)
    
    data = resp.json()
    if "data" not in data:
        print(f"  ERROR: {data.get('error', str(data)[:200])}")
        continue
    
    b64 = data["data"][0]["b64_json"]
    img = Image.open(BytesIO(base64.b64decode(b64)))
    
    # Remove black background
    img_rgba = remove_black_bg(img)
    img_rgba.save(out_path, "PNG")
    
    # Also save a preview
    preview = img_rgba.copy()
    preview.thumbnail((128, 128), Image.LANCZOS)
    preview.save(out_path.replace(".png", "_preview.png"), "PNG")
    
    print(f"  Saved {out_path} ({img.size})")
    time.sleep(2)  # cooldown between generations

print("\nDone! Generated locks:")
for lock in LOCKS:
    path = os.path.join(OUT_DIR, lock["file"])
    if os.path.exists(path):
        size = os.path.getsize(path)
        print(f"  {lock['file']} - {size/1024:.1f} KB")
