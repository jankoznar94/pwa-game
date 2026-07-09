#!/usr/bin/env python3
"""Generate 4 dungeon lock icons - WC3 style, gate padlocks, better transparency."""
import json, base64, sys, time, os
from io import BytesIO
from PIL import Image, ImageFilter
import requests

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/locks"
os.makedirs(OUT_DIR, exist_ok=True)

LOCKS = [
    {
        "file": "lock_desert.png",
        "prompt": "Warcraft 3 painting style game icon, heavy iron padlock on ancient sandstone gate, intricate golden pharaonic lock mechanism, scarab and ankh details, desert theme, painted fantasy art, dramatic side lighting, rich colors, sharp details, gritty texture, solid black background, no text, no UI, centered"
    },
    {
        "file": "lock_undead.png",
        "prompt": "Warcraft 3 painting style game icon, heavy iron padlock on necromantic bone gate, skull shaped lock mechanism, dark iron and bone, spikes, death knight theme, painted fantasy art, dramatic side lighting, dark grey and black, sharp details, gritty texture, solid black background, no text, no UI, centered"
    },
    {
        "file": "lock_hell.png",
        "prompt": "Warcraft 3 painting style game icon, heavy obsidian padlock on demonic iron gate, devil face lock mechanism, glowing lava cracks, horns, fiery red and orange, painted fantasy art, dramatic side lighting, sharp details, gritty texture, solid black background, no text, no UI, centered"
    },
    {
        "file": "lock_frost.png",
        "prompt": "Warcraft 3 painting style game icon, heavy ice crystal padlock on frozen iron gate, frost giant lock mechanism, sharp ice shards, pale blue and white, painted fantasy art, dramatic side lighting, sharp details, gritty texture, solid black background, no text, no UI, centered"
    }
]

def smart_remove_bg(img, dark_threshold=40, edge_blur=2):
    """Remove dark background with edge feathering for smoother alpha."""
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    # First pass: mark dark pixels
    alpha_mask = [[255 for _ in range(w)] for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # If all channels are dark (near black background)
            if r < dark_threshold and g < dark_threshold and b < dark_threshold:
                alpha_mask[y][x] = 0
    
    # Second pass: feather edges - if a pixel is surrounded by transparent, make it semi-transparent
    for y in range(1, h-1):
        for x in range(1, w-1):
            if alpha_mask[y][x] == 255:
                # Check if any neighbor is transparent
                neighbors = [
                    alpha_mask[y-1][x], alpha_mask[y+1][x],
                    alpha_mask[y][x-1], alpha_mask[y][x+1]
                ]
                if 0 in neighbors:
                    alpha_mask[y][x] = 128  # semi-transparent edge
    
    # Apply mask
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (r, g, b, alpha_mask[y][x])
    
    return img

for lock in LOCKS:
    out_path = os.path.join(OUT_DIR, lock["file"])
    print(f"Generating {lock['file']}...")
    
    resp = requests.post(LEMONADE, json={
        "model": "SDXL-Turbo",
        "prompt": lock["prompt"],
        "n": 1,
        "size": "512x512",
        "steps": 4
    }, timeout=120)
    
    data = resp.json()
    if "data" not in data:
        print(f"  ERROR: {data.get('error', str(data)[:200])}")
        continue
    
    b64 = data["data"][0]["b64_json"]
    img = Image.open(BytesIO(base64.b64decode(b64)))
    
    # Remove dark background with edge feathering
    img_rgba = smart_remove_bg(img, dark_threshold=35)
    
    # Resize to 64x64 for game use (small icon size)
    img_small = img_rgba.resize((64, 64), Image.LANCZOS)
    img_small.save(out_path, "PNG")
    
    # Preview at 128x128
    preview = img_rgba.resize((128, 128), Image.LANCZOS)
    preview.save(out_path.replace(".png", "_preview.png"), "PNG")
    
    print(f"  Saved {out_path}")
    time.sleep(3)

print("\nDone!")
