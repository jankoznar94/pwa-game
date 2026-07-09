#!/usr/bin/env python3
"""Third gamma pass for stubborn frost monsters."""

import os, math, statistics
from PIL import Image

OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/monsters"
files = [
    "ice_troll.png", "frost_giant.png", "polar_bear.png",
    "ice_dragon.png", "snow_golem.png", "frozen_knight.png",
    "ice_lizard.png"
]

target = 38.0

for fname in files:
    path = os.path.join(OUT_DIR, fname)
    img = Image.open(path)
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    gray = img.convert("L")
    pixels = list(gray.getdata())
    avg = statistics.mean(pixels)
    print(f"{fname}: {avg:.1f}/255", end="")

    if abs(avg - target) < 2.0:
        print(f" OK")
        continue

    gamma = math.log(target/255) / math.log(avg/255)
    print(f" -> gamma {gamma:.3f}", end="")
    img_gamma = img.point(lambda x: int(255 * ((x/255) ** gamma)))
    gray2 = img_gamma.convert("L")
    new_avg = statistics.mean(list(gray2.getdata()))
    print(f" -> {new_avg:.1f}/255", end="")

    if abs(new_avg - target) > 2.0:
        gamma2 = math.log(target/255) / math.log(new_avg/255)
        print(f" -> 2nd gamma {gamma2:.3f}", end="")
        img_gamma = img_gamma.point(lambda x: int(255 * ((x/255) ** gamma2)))
        gray3 = img_gamma.convert("L")
        new_avg = statistics.mean(list(gray3.getdata()))
        print(f" -> {new_avg:.1f}/255", end="")

    img_gamma.save(path, "PNG")
    print(f" OK")

print("\nDone!")
