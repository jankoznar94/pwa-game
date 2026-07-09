#!/usr/bin/env python3
"""Generate 25 item icons for Dungeon Recall — WC3 inventory icon style."""

import json, base64, subprocess, os, time
from PIL import Image

LEMONADE = "http://172.23.128.1:13305/v1/images/generations"
OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/items"

os.makedirs(OUT_DIR, exist_ok=True)

STYLE = """Create an item icon in the style of Warcraft 3 inventory icons.

STYLE:
- Painted/illustrated fantasy art style, like Warcraft 3 item icons
- SQUARE format, exactly 1:1 aspect ratio
- The item centered in the frame, filling most of the space
- Dark/black background
- Dramatic lighting from one side (top-left)
- Rich colors, sharp details, slightly gritty texture
- No UI elements, no frames, no text
- CRITICAL: The image MUST have NO white border, NO white padding, NO white frame of any kind. The artwork must go edge to edge — pure black background touching all four sides. Absolutely no white margin around the image.
- The item should be shown at a slight angle, as if sitting on a dark surface
- Focus on the item's distinctive shape and material

"""

items = [
    # Helmy (5) — od lehké po těžkou
    ("helmet_linen_hood.png",
     "COLOR PALETTE: CLOTH — brown linen, leather ties, bronze buckle, dark shadows.\nITEM: LINEN HOOD — a simple cloth hood made of brown linen, with leather ties at the neck, a small bronze buckle, worn and practical, like a commoner's hood, seen from the front at a slight angle"),
    ("helmet_iron_helm.png",
     "COLOR PALETTE: IRON — dark grey iron, rust spots, steel rivets, leather lining.\nITEM: IRON HELM — a simple iron helmet with a nose guard, riveted construction, visible hammer marks on the metal, leather lining visible at the bottom, practical soldier's helm, seen from the front"),
    ("helmet_steel_helm.png",
     "COLOR PALETTE: STEEL — polished steel, silver highlights, dark crevices, gold trim.\nITEM: STEEL HELM — a polished steel helmet with a visor slit, gold trim along the edges, a small plume socket on top, knightly and well-crafted, seen from the front at a slight angle"),
    ("helmet_silver_helm.png",
     "COLOR PALETTE: SILVER — bright silver, white-gold highlights, blue gem, dark steel.\nITEM: SILVER HELM — an ornate silver helmet with a raised crest, a small blue gem set in the forehead, intricate scrollwork along the brim, noble and ceremonial, seen from the front"),
    ("helmet_crown.png",
     "COLOR PALETTE: GOLD — pure gold, white gems, red rubies, royal purple lining.\nITEM: ARCANE CROWN — a majestic golden crown with five points, set with rubies and diamonds, purple velvet lining visible inside, glowing arcane energy faintly around it, fit for an archmage king, seen from the front"),

    # Zbroje (5) — od lehké po těžkou
    ("armor_leather.png",
     "COLOR PALETTE: LEATHER — brown leather, brass studs, dark stitching, worn edges.\nITEM: LEATHER ARMOR — a leather tunic with brass studs along the chest, dark stitching, worn and battle-scarred, practical adventurer's armor, seen from the front folded"),
    ("armor_chainmail.png",
     "COLOR PALETTE: CHAIN — interlocking steel rings, dark grey metal, silver highlights, leather trim.\nITEM: CHAINMAIL — a hauberk of interlocking steel rings, finely crafted chainmail, leather trim at the collar and hem, flexible and protective, seen from the front hanging"),
    ("armor_scale.png",
     "COLOR PALETTE: SCALE — overlapping steel plates, bronze edges, dark leather backing, rivets.\nITEM: SCALE ARMOR — overlapping metal scales sewn onto a leather backing, bronze-tipped edges, each scale individually riveted, sturdy and impressive, seen from the front"),
    ("armor_plate.png",
     "COLOR PALETTE: PLATE — polished steel plates, gold trim, red cloth underlayer, silver highlights.\nITEM: PLATE ARMOR — a steel breastplate with gold trim, polished to a mirror shine, red cloth visible at the edges, knightly and majestic, seen from the front"),
    ("armor_dragon_scale.png",
     "COLOR PALETTE: DRAGON — iridescent green-gold scales, dark leather, glowing runes, ancient.\nITEM: DRAGON SCALE ARMOR — armor made from dragon scales, iridescent green-gold shimmer, each scale large and thick, dark leather backing, faint magical glow, legendary and powerful, seen from the front"),

    # Melee zbraně (5) — od dýky po obouruční
    ("weapon_iron_sword.png",
     "COLOR PALETTE: IRON — dark grey iron blade, leather-wrapped grip, steel crossguard, black.\nITEM: IRON SWORD — a simple iron longsword, straight double-edged blade, leather-wrapped grip, steel crossguard, practical and unadorned, seen diagonally pointing up"),
    ("weapon_broad_sword.png",
     "COLOR PALETTE: STEEL — wide steel blade, brass crossguard, dark leather grip, silver.\nITEM: BROAD SWORD — a wide-bladed steel sword, brass crossguard with curved quillons, dark leather grip wrapped with wire, a small pommel gem, seen diagonally"),
    ("weapon_battle_axe.png",
     "COLOR PALETTE: BATTLE — steel axe head, dark wooden haft, iron bands, blood stains.\nITEM: BATTLE AXE — a fearsome battle axe with a large steel head, dark wooden haft reinforced with iron bands, a spike on top, worn and deadly, seen diagonally"),
    ("weapon_claymore.png",
     "COLOR PALETTE: CLAYMORE — massive steel blade, dark leather grip, silver crossguard, blue gem.\nITEM: CLAYMORE — an enormous two-handed greatsword, massive steel blade with a central fuller, dark leather grip long enough for two hands, ornate silver crossguard with a blue gem, seen vertically"),
    ("weapon_war_hammer.png",
     "COLOR PALETTE: DARK — blackened steel hammer head, rune-etched, dark wood haft, red glow.\nITEM: WAR HAMMER — a massive war hammer with a blackened steel head etched with runes, a spike on the back, thick dark wood haft reinforced with steel bands, faint red glow from the runes, seen diagonally"),

    # Magické zbraně (5) — od hůlky po arcimágovu hůl
    ("staff_wooden.png",
     "COLOR PALETTE: WOOD — brown wood, simple carving, leather wrap, natural.\nITEM: WOODEN STAFF — a simple wooden staff, slightly crooked, carved with basic spiral patterns, leather wrapped at the grip, natural and unadorned, a beginner's staff, seen vertically"),
    ("staff_fire.png",
     "COLOR PALETTE: FIRE — orange-red crystal, dark wood, gold bands, glowing embers.\nITEM: FIRE STAFF — a dark wooden staff topped with a glowing orange-red crystal, gold bands wrapping the wood, embers floating around the crystal, warm magical light, seen vertically"),
    ("staff_ice.png",
     "COLOR PALETTE: ICE — pale blue crystal, silver wood, frost patterns, glowing cyan.\nITEM: ICE STAFF — a staff made of pale silver wood, topped with a frost-covered blue crystal, intricate ice patterns carved into the shaft, cold mist rising, seen vertically"),
    ("staff_lightning.png",
     "COLOR PALETTE: LIGHTNING — blue-white crystal, dark metal shaft, copper coils, sparks.\nITEM: LIGHTNING STAFF — a dark metal staff with copper wire coils along the shaft, a crackling blue-white crystal at the top, small arcs of electricity jumping between the coils, seen vertically"),
    ("staff_archmage.png",
     "COLOR PALETTE: ARCANE — deep purple crystal, gold filigree, glowing runes, starry.\nITEM: ARCHMAGE STAFF — a magnificent staff of gold and dark wood, topped with a large deep purple crystal orb, intricate gold filigree, glowing arcane runes along the shaft, stars swirling inside the crystal, seen vertically"),

    # Prsteny (5) — od jednoduchého po drahokamový
    ("ring_copper.png",
     "COLOR PALETTE: COPPER — reddish-brown copper, simple band, dark patina, worn.\nITEM: COPPER RING — a simple copper band ring, reddish-brown with dark patina in the crevices, worn smooth from use, unadorned and humble, seen from above at an angle"),
    ("ring_silver.png",
     "COLOR PALETTE: SILVER — bright silver, simple band, polished shine, dark background.\nITEM: SILVER RING — a polished silver band ring, simple but elegant, bright reflective surface, a thin engraved line around the middle, seen from above at an angle"),
    ("ring_gold.png",
     "COLOR PALETTE: GOLD — pure gold, warm yellow, polished shine, ornate edges.\nITEM: GOLD RING — a thick gold band ring, warm yellow metal, polished to a bright shine, ornate edges with a decorative pattern, substantial and valuable, seen from above at an angle"),
    ("ring_gem.png",
     "COLOR PALETTE: GEM — gold band, deep red ruby, sparkling facets, silver setting.\nITEM: GEM RING — an elaborate gold ring set with a large deep red ruby, the ruby is faceted and sparkles, intricate silver filigree around the stone, four small diamonds flanking the ruby, seen from above"),
    ("ring_platinum.png",
     "COLOR PALETTE: PLATINUM — white-grey platinum, blue sapphire, diamond accents, elegant.\nITEM: PLATINUM RING — a platinum band set with a brilliant blue sapphire, two small diamonds on each side, elegant and refined, the metal has a cool white-grey sheen, seen from above at an angle"),
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
    print(f"  Saved: {size_kb:.1f} KB")
    return True

for filename, desc in items:
    success = generate(filename, desc)
    if not success:
        print(f"  FAILED: {filename}")
    time.sleep(2)

print("\n=== DONE ===")
for filename, _ in items:
    path = os.path.join(OUT_DIR, filename)
    if os.path.exists(path):
        print(f"  {filename}: {os.path.getsize(path)/1024:.1f} KB")
    else:
        print(f"  {filename}: MISSING!")
