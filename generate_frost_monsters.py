#!/usr/bin/env python3
"""Generate all 9 monster portraits for Mrazivé štíty (Frost Peaks) dungeon."""

import json, base64, subprocess, sys, time, os, math, statistics
from PIL import Image

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/monsters"

os.makedirs(OUT_DIR, exist_ok=True)

# WC3-style prompt template
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

COLOR PALETTE: FROST PEAKS — icy blues, pale whites, frosty greys, glowing cyan eyes, frozen crystals, hoarfrost, pale blue skin, silver and ice accents

MONSTER: """

monsters = [
    ("ice_troll.png", "ICE TROLL — a massive frost troll with pale blue-grey skin covered in frost and ice crystals, thick fur around the neck and shoulders, small tusks protruding from the lower jaw, glowing cyan eyes, frost-covered matted hair, icicles hanging from the brows, a brutal and savage expression, frozen breath visible"),
    ("frost_giant.png", "FROST GIANT — a colossal frost giant with pale blue-white skin like frozen stone, a thick beard of ice crystals, long matted white hair, glowing cyan eyes deep in their sockets, a fur-lined leather helmet, frost covering the face, cracked icy skin, ancient and powerful, a grim determined expression"),
    ("polar_bear.png", "POLAR BEAR — a massive polar bear face, thick white fur with a yellowish tint, small dark eyes with an intelligent predatory gaze, a large black nose, slightly open mouth showing sharp teeth, frost on the fur around the muzzle, ears flat against the head, powerful and majestic, the king of the frozen wastes"),
    ("snow_wolf.png", "SNOW WOLF — a white-furred arctic wolf, thick winter coat, pale blue-grey eyes with an intense predatory stare, ears perked forward, frost on the fur around the snout, slightly open mouth showing sharp fangs, breath visible as cold mist, intelligent and savage, a lone hunter of the frozen peaks"),
    ("ice_dragon.png", "ICE DRAGON — a dragon head made of crystalline ice, scales are translucent blue-white like frozen glaciers, large horns made of solid ice curving backward, glowing cyan eyes with vertical reptilian pupils, frost and ice crystals forming a mane around the head, open mouth showing icicle-like fangs, cold mist streaming from the nostrils, ancient and majestic elemental dragon"),
    ("snow_golem.png", "SNOW GOLEM — a golem made of packed snow and ice, a roughly humanoid face formed from snow, two glowing blue crystal eyes embedded in the snow, icicles hanging from the chin like a beard, cracks in the snow showing blue ice beneath, a simple but menacing expression, elemental and powerful, like a living avalanche"),
    ("frozen_knight.png", "FROZEN KNIGHT — an undead knight frozen in eternal ice, pale blue-white skin visible through a cracked ice-covered helmet, glowing cyan eyes, the helmet is covered in frost and small ice crystals, a frozen beard of icicles, the armor is ancient and covered in hoarfrost, a silent and tragic figure, the eternal sentinel of the frozen peaks"),
    ("ice_lizard.png", "ICE LIZARD — a frost-covered reptilian face, pale blue scales with white frost patterns, two glowing cyan eyes with vertical slit pupils, small ice crystal horns on the head, a forked tongue flickering out, frost on the scales, a cold calculating gaze, like a frozen version of a desert lizard adapted to arctic conditions"),
    ("frost_titan.png", "FROST TITAN — THE ULTIMATE BOSS, a titanic being of living ice and frost, a face carved from ancient glacier ice, two massive burning cyan eyes like frozen stars, a crown of jagged ice crystals on the head, the face is cracked with glowing blue energy in the fissures, a frozen beard of icicles, cold mist swirling around, majestic and terrifying, the primordial embodiment of winter itself"),
]

def generate_image(prompt, filename):
    print(f"\n=== Generating {filename} ===")
    payload = {
        "model": "Flux-2-Klein-9B-GGUF",
        "prompt": prompt,
        "n": 1,
        "size": "256x256",
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
    print(f"  Generated: {len(img_bytes)} bytes")

    # Gamma correction
    img = Image.open(tmp_png)
    gray = img.convert("L")
    pixels = list(gray.getdata())
    avg = statistics.mean(pixels)
    print(f"  Avg brightness: {avg:.1f}/255")

    target = 38.0
    gamma = math.log(target/255) / math.log(avg/255)
    print(f"  Gamma: {gamma:.3f}")

    table = [int(255 * ((i/255) ** gamma)) for i in range(256)]
    img_gamma = img.point(table * 3)
    gray2 = img_gamma.convert("L")
    new_avg = statistics.mean(list(gray2.getdata()))
    print(f"  After gamma {gamma:.3f}: {new_avg:.1f}/255")

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
    prompt = STYLE + desc
    success = generate_image(prompt, filename)
    if not success:
        print(f"  FAILED: {filename}")
    # Small delay between generations
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
