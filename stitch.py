import sys

with open('app/about/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:134]

with open('__replacement.txt', 'r', encoding='utf-8') as f:
    replacement = f.read()

# Make sure we don't end up with doubly escaped backticks due to the shell if there are any, 
# although we used Here-String which is fine. The only backtick in React is key={...}
# Let's fix the placeholder string issue if any:
# In the PowerShell script I wrote placeholder--
replacement = replacement.replace("placeholder-", "placeholder-")
replacement = replacement.replace("-", "-")

with open('app/about/page.tsx.new', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    f.write(replacement)

