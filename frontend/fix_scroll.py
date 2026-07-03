with open("src/index.css", "r", encoding="utf-8") as f:
    code = f.read()

css_overrides = """
/* Hide scrollbar for Project Grid */
.proj-grid::-webkit-scrollbar {
  display: none;
}
.proj-grid {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
"""

code += css_overrides

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(code)

print("CSS updated to hide scrollbar.")
