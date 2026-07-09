#!/usr/bin/env python3
"""Regenerate undead, hell, frost gates at 3:1 (1024x341) like desert."""
import json, base64, sys, time, os
from io import BytesIO
from PIL import Image
import requests

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/gates"

GATES = [
    {
        "file": "gate_undead.png",
        "prompt": "Warcraft 3 painting style, wide horizontal view of a necromantic bone fortress gate, skull shaped iron padlock, dark iron spikes and bone carvings, wide dark stone walls on both sides, death knight theme, dark grey and black, painted fantasy art, dramatic side lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_hell.png",
        "prompt": "Warcraft 3 painting style, wide horizontal view of a demonic obsidian fortress gate, devil face iron padlock, glowing lava cracks, demonic carvings, wide dark stone walls on both sides, hell theme, fiery red and orange, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_frost.png",
        "prompt": "Warcraft 3 painting style, wide horizontal view of a frozen ice fortress gate, crystalline ice padlock, sharp ice shards and frost carvings, wide ice stone walls on both sides, frost giant theme, pale blue and white, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    }
]

for gate in GATES:
    out_path = os.path.join(OUT_DIR, gate["file"])
    print(f"Generating {gate['file']}...")
    
    resp = requests.post(LEMONADE, json={
        "model": "SDXL-Turbo",
        "prompt": gate["prompt"],
        "n": 1,
        "size": "1024x341",
        "steps": 4
    }, timeout=120)
    
    data = resp.json()
    if "data" not in data:
        print(f"  ERROR: {data.get('error', str(data)[:200])}")
        continue
    
    b64 = data["data"][0]["b64_json"]
    img = Image.open(BytesIO(base64.b64decode(b64)))
    
    final = img.resize((900, 300), Image.LANCZOS)
    final.save(out_path, "PNG")
    
    preview = final.copy()
    preview.thumbnail((450, 150), Image.LANCZOS)
    preview.save(out_path.replace(".png", "_preview.png"), "PNG")
    
    print(f"  Saved {out_path} (900x300)")
    time.sleep(3)

print("\nDone!")
