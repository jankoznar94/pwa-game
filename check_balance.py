import re, sys

with open('dist/game.js', 'r') as f:
    content = f.read()

braces = parens = brackets = 0
state = None  # None, 'string_dq', 'string_sq', 'template'
i = 0
while i < len(content):
    c = content[i]

    if state == 'string_dq':
        if c == '\\' and i+1 < len(content):
            i += 2
            continue
        if c == '"':
            state = None
        i += 1
        continue

    if state == 'string_sq':
        if c == '\\' and i+1 < len(content):
            i += 2
            continue
        if c == "'":
            state = None
        i += 1
        continue

    if state == 'template':
        if c == '\\' and i+1 < len(content):
            i += 2
            continue
        if c == '`':
            state = None
        elif c == '$' and i+1 < len(content) and content[i+1] == '{':
            depth = 1
            i += 2
            while i < len(content) and depth > 0:
                if content[i] == '{':
                    depth += 1
                elif content[i] == '}':
                    depth -= 1
                i += 1
            continue
        i += 1
        continue

    if c == '"':
        state = 'string_dq'
    elif c == "'":
        state = 'string_sq'
    elif c == '`':
        state = 'template'
    elif c == '{':
        braces += 1
    elif c == '}':
        braces -= 1
    elif c == '(':
        parens += 1
    elif c == ')':
        parens -= 1
    elif c == '[':
        brackets += 1
    elif c == ']':
        brackets -= 1

    i += 1

print(f'Braces: {braces}, Parens: {parens}, Brackets: {brackets}')
if braces == parens == brackets == 0:
    print('OK')
else:
    print('NOT BALANCED')
    sys.exit(1)