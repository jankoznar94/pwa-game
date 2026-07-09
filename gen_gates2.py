#!/usr/bin/env python3
"""Regenerate 4 dungeon gates at wider aspect ratio (5:1)."""
import json, base64, sys, time, os
from io import BytesIO
from PIL import Image
import requests

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/gates"
os.makedirs(OUT_DIR, exist_ok=True)

GATES = [
    {
        "file": "gate_desert.png",
        "prompt": "Warcraft 3 painting style, wide ancient sandstone gate, heavy iron padlock with golden pharaonic lock mechanism, scarab and ankh carvings on stone pillars, desert fortress entrance, painted fantasy art, dramatic lighting, rich colors, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_undead.png",
        "prompt": "Warcraft 3 painting style, wide necromantic bone gate, skull shaped iron padlock, dark iron spikes and bone pillars, death knight fortress entrance, dark grey and black, painted fantasy art, dramatic side lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_hell.png",
        "prompt": "Warcraft 3 painting style, wide demonic obsidian gate, devil face iron padlock, glowing lava cracks, horns and skulls on pillars, hell fortress entrance, fiery red and orange, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_frost.png",
        "prompt": "Warcraft 3 painting style, wide frozen ice gate, crystalline ice padlock, sharp ice shards and frost covered pillars, frost giant fortress entrance, pale blue and white, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    }
]

for gate in GATES:
    out_path = os.path.join(OUT_DIR, gate["file"])
    print(f"Generating {gate['file']}...")
    
    resp = requests.post(LEMONADE, json={
        "model": "SDXL-Turbo",
        "prompt": gate["prompt"],
        "n": 1,
        "size": "1024x1024",
        "steps": 4
    }, timeout=120)
    
    data = resp.json()
    if "data" not in data:
        print(f"  ERROR: {data.get('error', str(data)[:200])}")
        continue
    
    b64 = data["data"][0]["b64_json"]
    img = Image.open(BytesIO(base64.b64decode(b64)))
    
    # Crop to 5:1 (1024x200) - wide banner
    w, h = img.size
    target_h = w // 5
    y_offset = (h - target_h) // 2
    cropped = img.crop((0, y_offset, w, y_offset + target_h))
    
    # Resize to game size (800x160)
    final = cropped.resize((800, 160), Image.LANCZOS)
    final.save(out_path, "PNG")
    
    # Preview
    preview = final.copy()
    preview.thumbnail((400, 80), Image.LANCZOS)
    preview.save(out_path.replace(".png", "_preview.png"), "PNG")
    
    print(f"  Saved {out_path} (800x160)")
    time.sleep(3)

print("\nDone!")
