#!/usr/bin/env python3
"""Regenerate frost monsters with short prompts matching hellspire/undead style."""

import json, base64, subprocess, sys, time, os, math, statistics
from PIL import Image

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/monsters"

os.makedirs(OUT_DIR, exist_ok=True)

STYLE = "Create a monster face portrait in the style of Warcraft 3 unit icons. SQUARE format, close-up of the face, dark background, dramatic lighting, rich colors, sharp details, no white border."

monsters = [
    ("ice_troll.png",
     "COLOR PALETTE: FROST — icy blue skin, frost crystals, glowing cyan eyes, white fur, ice.\nMONSTER: ICE TROLL — massive frost troll with pale blue-grey skin covered in frost, thick white fur around the neck, small tusks, glowing cyan eyes, icicles hanging from the brows, brutal savage expression"),
    ("frost_giant.png",
     "COLOR PALETTE: FROST — pale blue-white skin like frozen stone, ice crystals, glowing cyan eyes, white fur, silver.\nMONSTER: FROST GIANT — colossal giant with pale blue-white skin, thick ice crystal beard, long white hair, glowing cyan eyes, fur-lined leather helmet, frost covering the cracked icy face, ancient and powerful"),
    ("polar_bear.png",
     "COLOR PALETTE: ARCTIC — white fur, pale yellow tint, dark eyes, black nose, frost.\nMONSTER: POLAR BEAR — massive polar bear face, thick white fur with yellowish tint, small dark intelligent eyes, large black nose, slightly open mouth showing sharp teeth, frost on the muzzle, powerful majestic king of the frozen wastes"),
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

def generate_image(prompt, filename):
    print(f"\n=== Generating {filename} ===")
    payload = {
        "model": "Flux-2-Klein-9B-GGUF",
        "prompt": prompt,
        "n": 1,
        "size": "512x512",
        "steps": 40,
        "cfg_scale": 1.0
    }
    resp_path = f"/tmp/{filename}.json"
    r = subprocess.run([
        "curl", "-s", "--max-time", "600",
        "-X", "POST", LEMONADE,
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload),
        "--output", resp_path
    ], capture_output=True, text=True, timeout=620)
    if r.returncode != 0:
        print(f"  ERROR: curl failed: {r.stderr}")
        return False
    with open(resp_path) as f:
        data = json.load(f)
    if "data" not in data or not data["data"]:
        print(f"  ERROR: bad response: {data}")
        return False
    b64 = data["data"][0]["b64_json"]
    img_bytes = base64.b64decode(b64)
    tmp_png = f"/tmp/{filename}"
    with open(tmp_png, "wb") as f:
        f.write(img_bytes)
    print(f"  Generated: {len(img_bytes)} bytes (512x512)")

    # Scale down to 256x256
    img = Image.open(tmp_png)
    img = img.resize((256, 256), Image.LANCZOS)
    print(f"  Scaled to 256x256")

    # Gamma correction — convert to RGB first
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    gray = img.convert("L")
    pixels = list(gray.getdata())
    avg = statistics.mean(pixels)
    print(f"  Avg brightness: {avg:.1f}/255")

    target = 38.0
    gamma = math.log(target/255) / math.log(avg/255)
    print(f"  Gamma: {gamma:.3f}")

    img_gamma = img.point(lambda x: int(255 * ((x/255) ** gamma)))
    gray2 = img_gamma.convert("L")
    new_avg = statistics.mean(list(gray2.getdata()))
    print(f"  After gamma: {new_avg:.1f}/255")

    # Second pass if needed
    if abs(new_avg - target) > 3.0:
        gamma2 = math.log(target/255) / math.log(new_avg/255)
        print(f"  2nd pass gamma {gamma2:.3f}", end="")
        img_gamma = img_gamma.point(lambda x: int(255 * ((x/255) ** gamma2)))
        gray3 = img_gamma.convert("L")
        new_avg = statistics.mean(list(gray3.getdata()))
        print(f" -> {new_avg:.1f}/255")

    out_path = os.path.join(OUT_DIR, filename)
    img_gamma.save(out_path, "PNG")
    print(f"  Saved to {out_path}")

    # pngquant
    subprocess.run([
        "/usr/bin/pngquant", "--quality=60-80", "--speed=1", "--force",
        "--output", out_path, "--", out_path
    ], capture_output=True, text=True, timeout=30)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"  After pngquant: {size_kb:.1f} KB")
    return True

for filename, desc in monsters:
    prompt = STYLE + "\n\n" + desc
    success = generate_image(prompt, filename)
    if not success:
        print(f"  FAILED: {filename}")
    time.sleep(2)

print("\n=== DONE ===")
print("Generated files:")
for filename, _ in monsters:
    path = os.path.join(OUT_DIR, filename)
    if os.path.exists(path):
        size = os.path.getsize(path) / 1024
        print(f"  {filename}: {size:.1f} KB")
    else:
        print(f"  {filename}: MISSING!")
