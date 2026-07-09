#!/usr/bin/env python3
"""Regenerate gates - full square, no crop, CSS cover handles stretching."""
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
        "prompt": "Warcraft 3 painting style, massive ancient sandstone gate in center of image, heavy iron padlock with golden pharaonic lock mechanism, scarab and ankh carvings, wide decorated stone walls on both sides, lots of wall above and below the gate, desert fortress, painted fantasy art, dramatic lighting, rich colors, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_undead.png",
        "prompt": "Warcraft 3 painting style, massive necromantic bone gate in center of image, skull shaped iron padlock, dark iron spikes and bone carvings, wide dark stone walls on both sides, lots of wall above and below the gate, death knight fortress, dark grey and black, painted fantasy art, dramatic side lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_hell.png",
        "prompt": "Warcraft 3 painting style, massive demonic obsidian gate in center of image, devil face iron padlock, glowing lava cracks, demonic carvings, wide dark stone walls on both sides, lots of wall above and below the gate, hell fortress, fiery red and orange, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_frost.png",
        "prompt": "Warcraft 3 painting style, massive frozen ice gate in center of image, crystalline ice padlock, sharp ice shards and frost carvings, wide ice stone walls on both sides, lots of wall above and below the gate, frost giant fortress, pale blue and white, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
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
    
    # NO CROP - just resize to 300x300 square
    # CSS background-size:cover will stretch it to fill card width
    # Gate stays fully visible in center
    final = img.resize((300, 300), Image.LANCZOS)
    final.save(out_path, "PNG")
    
    # Preview
    preview = final.copy()
    preview.thumbnail((200, 200), Image.LANCZOS)
    preview.save(out_path.replace(".png", "_preview.png"), "PNG")
    
    print(f"  Saved {out_path} (300x300 square)")
    time.sleep(3)

print("\nDone!")
