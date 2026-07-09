#!/usr/bin/env python3
"""Generate gates - gate only in middle 1/5 of square, top/bottom 2/5 each are wall filler for cropping."""
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
        "prompt": "Warcraft 3 painting style, a very short wide ancient sandstone gate in the middle of the image, the gate is very small vertically only occupying the center fifth of the image, above the gate is a huge tall sandstone wall extending upward, below the gate is a huge tall sandstone wall extending downward, wide stone walls on both sides of the gate, heavy iron padlock with golden pharaonic lock, scarab and ankh carvings, desert fortress, painted fantasy art, dramatic lighting, rich colors, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_undead.png",
        "prompt": "Warcraft 3 painting style, a very short wide necromantic bone gate in the middle of the image, the gate is very small vertically only occupying the center fifth of the image, above the gate is a huge tall dark stone wall extending upward, below the gate is a huge tall dark stone wall extending downward, wide stone walls on both sides of the gate, skull shaped iron padlock, dark iron spikes and bone carvings, death knight fortress, dark grey and black, painted fantasy art, dramatic side lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_hell.png",
        "prompt": "Warcraft 3 painting style, a very short wide demonic obsidian gate in the middle of the image, the gate is very small vertically only occupying the center fifth of the image, above the gate is a huge tall dark stone wall extending upward, below the gate is a huge tall dark stone wall extending downward, wide stone walls on both sides of the gate, devil face iron padlock, glowing lava cracks, demonic carvings, hell fortress, fiery red and orange, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
    },
    {
        "file": "gate_frost.png",
        "prompt": "Warcraft 3 painting style, a very short wide frozen ice gate in the middle of the image, the gate is very small vertically only occupying the center fifth of the image, above the gate is a huge tall ice stone wall extending upward, below the gate is a huge tall ice stone wall extending downward, wide stone walls on both sides of the gate, crystalline ice padlock, sharp ice shards and frost carvings, frost giant fortress, pale blue and white, painted fantasy art, dramatic lighting, gritty texture, solid black background, no text, no UI"
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
    
    # Crop to 5:1 (1024x205) - this captures the middle 1/5 where the gate is
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
