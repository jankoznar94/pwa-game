import re

with open('/home/martin_fabian/pwa-game/dist/game.js', 'r') as f:
    content = f.read()

# Remove content inside template literals (backticks) and strings to avoid false positives
# First remove backtick strings (template literals)
cleaned = re.sub(r'`[^`]*`', '', content)
# Remove single-quoted strings (simplified - won't handle escapes perfectly but good enough)
# Actually for brace checking, template literals are the main issue
# Let's just remove backtick content
lines = content.split('\n')
in_backtick = False
for i, line in enumerate(lines, 1):
    for ch in line:
        if ch == '`':
            in_backtick = not in_backtick

# Count braces outside template literals
stack = []
for i, line in enumerate(lines, 1):
    in_backtick = False
    for ch in line:
        if ch == '`':
            in_backtick = not in_backtick
        elif in_backtick:
            continue
        if ch == '{':
            stack.append((ch, i))
        elif ch == '}':
            if not stack:
                print(f"UNBALANCED: extra '}}' at line {i}")
                continue
            stack.pop()

if stack:
    print(f"UNBALANCED: {len(stack)} unclosed '{{'")
    for ch, line in stack:
        print(f"  at line {line}")
else:
    print("All braces balanced OK")