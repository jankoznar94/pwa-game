#!/usr/bin/env python3
"""Generate gates - naturally wide gate, crop to 5:1, contain CSS preserves proportions."""
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
        "prompt": "Warcraft 3 painting style, wide horizontal view of an ancient sandstone fortress gate, the gate is wide and short, heavy iron padlock with golden pharaonic lock mechanism, scarab and ankh carvings on stone pillars, decorated stone walls on both sides, desert theme, painted fantasy art, dramatic lighting, rich colors, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_undead.png",
        "prompt": "Warcraft 3 painting style, wide horizontal view of a necromantic bone fortress gate, the gate is wide and short, skull shaped iron padlock, dark iron spikes and bone carvings on pillars, dark stone walls on both sides, death knight theme, dark grey and black, painted fantasy art, dramatic side lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_hell.png",
        "prompt": "Warcraft 3 painting style, wide horizontal view of a demonic obsidian fortress gate, the gate is wide and short, devil face iron padlock, glowing lava cracks, demonic carvings on pillars, dark stone walls on both sides, hell theme, fiery red and orange, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_frost.png",
        "prompt": "Warcraft 3 painting style, wide horizontal view of a frozen ice fortress gate, the gate is wide and short, crystalline ice padlock, sharp ice shards and frost carvings on pillars, ice stone walls on both sides, frost giant theme, pale blue and white, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
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
    
    # Crop to 5:1 (1024x205) - very wide, gate should fill most of it
    w, h = img.size
    target_h = w // 5
    y_offset = (h - target_h) // 2
    cropped = img.crop((0, y_offset, w, y_offset + target_h))
    
    # Resize to game size (1000x200)
    final = cropped.resize((1000, 200), Image.LANCZOS)
    final.save(out_path, "PNG")
    
    # Preview
    preview = final.copy()
    preview.thumbnail((500, 100), Image.LANCZOS)
    preview.save(out_path.replace(".png", "_preview.png"), "PNG")
    
    print(f"  Saved {out_path} (1000x200)")
    time.sleep(3)

print("\nDone!")
