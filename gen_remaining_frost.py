#!/usr/bin/env python3
"""Regenerate all remaining frost monsters — full WC3 prompt, no gamma correction."""

import json, base64, subprocess, os, time
from PIL import Image

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/monsters"

STYLE = """Create a monster face portrait in the style of Warcraft 3 unit icons.

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

"""

monsters = [
    ("ice_troll.png",
     "COLOR PALETTE: FROST — icy blue skin, frost crystals, glowing cyan eyes, white fur, ice.\nMONSTER: ICE TROLL — massive frost troll with pale blue-grey skin covered in frost, thick white fur around the neck, small tusks, glowing cyan eyes, icicles hanging from the brows, brutal savage expression"),
    ("snow_wolf.png",
     "COLOR PALETTE: ARCTIC — white fur, pale blue-grey eyes, frost on snout, silver.\nMONSTER: SNOW WOLF — white-furred arctic wolf, thick winter coat, pale blue-grey intense predatory eyes, ears perked forward, frost on the snout, slightly open mouth showing fangs, intelligent and savage lone hunter"),
    ("ice_dragon.png",
     "COLOR PALETTE: ICE — translucent blue-white crystalline scales, glowing cyan eyes, ice horns, frost.\nMONSTER: ICE DRAGON — dragon head made of crystalline ice, translucent blue-white glacier scales, large curved ice horns, glowing cyan reptilian eyes, ice crystal mane, open mouth with icicle fangs, cold mist from nostrils, ancient elemental dragon"),
    ("snow_golem.png",
     "COLOR PALETTE: SNOW — packed white snow, blue ice crystals, glowing blue eyes, frost.\nMONSTER: SNOW GOLEM — golem made of packed snow and ice, roughly humanoid face, two glowing blue crystal eyes, icicle beard, cracks showing blue ice beneath, simple menacing expression, like a living avalanche"),
    ("frozen_knight.png",
     "COLOR PALETTE: FROST — pale blue-white skin, ice-covered armor, glowing cyan eyes, hoarfrost, silver.\nMONSTER: FROZEN KNIGHT — undead knight frozen in eternal ice, pale blue-white skin visible through cracked ice-covered helmet, glowing cyan eyes, frost and ice crystals on the helmet, frozen icicle beard, ancient armor covered in hoarfrost, silent tragic sentinel"),
    ("ice_lizard.png",
     "COLOR PALETTE: ICE — pale blue scales, white frost patterns, glowing cyan eyes, ice horns.\nMONSTER: ICE LIZARD — frost-covered reptilian face, pale blue scales with white frost patterns, glowing cyan eyes with vertical slit pupils, small ice crystal horns, forked tongue flickering, cold calculating gaze, arctic predator"),
    ("frost_titan.png",
     "COLOR PALETTE: FROST TITAN — ancient glacier ice, burning cyan eyes, jagged ice crystals, blue energy, frost.\nMONSTER: FROST TITAN — titanic being of living ice, face carved from ancient glacier, massive burning cyan eyes like frozen stars, crown of jagged ice crystals, cracked face with glowing blue energy in fissures, frozen icicle beard, cold mist swirling, primordial embodiment of winter"),
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
    print(f"  Saved: {size_kb:.1f} KB (no gamma)")
    return True

for filename, desc in monsters:
    success = generate(filename, desc)
    if not success:
        print(f"  FAILED: {filename}")
    time.sleep(2)

print("\n=== DONE ===")
for filename, _ in monsters:
    path = os.path.join(OUT_DIR, filename)
    if os.path.exists(path):
        print(f"  {filename}: {os.path.getsize(path)/1024:.1f} KB")
    else:
        print(f"  {filename}: MISSING!")
