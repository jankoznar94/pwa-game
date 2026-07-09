#!/usr/bin/env python3
"""Re-apply gamma correction to all frost monsters to hit ~38/255 target."""

import os, math, statistics
from PIL import Image

OUT_DIR = "/home/martin_fabian/pwa-game/dist/assets/monsters"
files = [
    "ice_troll.png", "frost_giant.png", "polar_bear.png",
    "snow_wolf.png", "ice_dragon.png", "snow_golem.png",
    "frozen_knight.png", "ice_lizard.png", "frost_titan.png"
]

target = 38.0

for fname in files:
    path = os.path.join(OUT_DIR, fname)
    if not os.path.exists(path):
        print(f"{fname}: NOT FOUND")
        continue

    img = Image.open(path)
    gray = img.convert("L")
    pixels = list(gray.getdata())
    avg = statistics.mean(pixels)
    print(f"{fname}: current avg {avg:.1f}/255", end="")

    if abs(avg - target) < 2.0:
        print(f" — already close enough, skipping")
        continue

    gamma = math.log(target/255) / math.log(avg/255)
    print(f" → gamma {gamma:.3f}", end="")

    # Single table (256 entries) applies to all bands equally
    table = [int(255 * ((i/255) ** gamma)) for i in range(256)]
    img_gamma = img.point(table)
    gray2 = img_gamma.convert("L")
    new_avg = statistics.mean(list(gray2.getdata()))
    print(f" → {new_avg:.1f}/255", end="")

    # If still off, do a second pass
    if abs(new_avg - target) > 3.0:
        gamma2 = math.log(target/255) / math.log(new_avg/255)
        print(f" → 2nd pass gamma {gamma2:.3f}", end="")
        table2 = [int(255 * ((i/255) ** gamma2)) for i in range(256)]
        img_gamma = img_gamma.point(table2)
        gray3 = img_gamma.convert("L")
        new_avg = statistics.mean(list(gray3.getdata()))
        print(f" → {new_avg:.1f}/255", end="")

    img_gamma.save(path, "PNG")
    print(f" ✓")

print("\nRe-running pngquant...")
import subprocess
for fname in files:
    path = os.path.join(OUT_DIR, fname)
    if os.path.exists(path):
        subprocess.run([
            "/usr/bin/pngquant", "--quality=60-80", "--speed=1", "--force",
            "--output", path, "--", path
        ], capture_output=True, text=True, timeout=30)
        size = os.path.getsize(path) / 1024
        print(f"  {fname}: {size:.1f} KB")

print("\nDone!")
