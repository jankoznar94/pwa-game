#!/usr/bin/env python3
"""Regenerate gates - gate small in center, lots of wall above/below, crop to 3:1 shows full gate."""
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
        "prompt": "Warcraft 3 painting style, wide view of massive sandstone fortress wall, small ancient gate in center surrounded by huge decorated stone walls extending far to left and right, heavy iron padlock with golden pharaonic lock, scarab and ankh carvings, lots of wall above and below the gate, desert theme, painted fantasy art, dramatic lighting, rich colors, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_undead.png",
        "prompt": "Warcraft 3 painting style, wide view of massive necromantic fortress wall, small bone gate in center surrounded by huge dark stone walls extending far to left and right, skull shaped iron padlock, dark iron spikes and bone carvings, lots of wall above and below the gate, death knight theme, dark grey and black, painted fantasy art, dramatic side lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_hell.png",
        "prompt": "Warcraft 3 painting style, wide view of massive demonic fortress wall, small obsidian gate in center surrounded by huge dark stone walls extending far to left and right, devil face iron padlock, glowing lava cracks, demonic carvings, lots of wall above and below the gate, hell theme, fiery red and orange, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_frost.png",
        "prompt": "Warcraft 3 painting style, wide view of massive ice fortress wall, small frozen gate in center surrounded by huge ice stone walls extending far to left and right, crystalline ice padlock, sharp ice shards and frost carvings, lots of wall above and below the gate, frost giant theme, pale blue and white, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
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
    
    # Crop to 3:1 (1024x341) - with gate small in center, this should show full gate + wide walls
    w, h = img.size
    target_h = w // 3
    y_offset = (h - target_h) // 2
    cropped = img.crop((0, y_offset, w, y_offset + target_h))
    
    # Resize to game size (900x300)
    final = cropped.resize((900, 300), Image.LANCZOS)
    final.save(out_path, "PNG")
    
    # Preview
    preview = final.copy()
    preview.thumbnail((450, 150), Image.LANCZOS)
    preview.save(out_path.replace(".png", "_preview.png"), "PNG")
    
    print(f"  Saved {out_path} (900x300)")
    time.sleep(3)

print("\nDone!")
