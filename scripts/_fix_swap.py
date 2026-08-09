from pathlib import Path
import re

p = Path('src/styles/marketing.css')
t = p.read_text(encoding='utf-8')
t = t.replace("font-family: 'DM Serif Display', Georgia, serif", 'font-family: var(--mkt-font-display)')
t = t.replace("font-family: 'DM Sans', system-ui, sans-serif", 'font-family: var(--mkt-font-body)')
t, n = re.subn(
    r'\.mkt-brand \{[^}]+\}',
    """.mkt-brand {
  display: block;
  font-family: var(--mkt-font-display);
  font-size: clamp(2.2rem, 5.5vw, 3.35rem);
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 0.55rem;
  color: #fff;
}""",
    t,
    count=1,
)
p.write_text(t, encoding='utf-8')
print('brand replacements', n)
print('DM Serif left', t.count('DM Serif'))
print('DM Sans left', t.count('DM Sans'))
print('display vars', t.count('var(--mkt-font-display)'))
