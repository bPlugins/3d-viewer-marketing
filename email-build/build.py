"""Build 3d-viewer-pro-feature-emails.html from emails.json + the dev copy file.

Run: python3 email-build/build.py   (add --check to only validate)
"""
import json, html, re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "3d-viewer-pro-feature-emails.html")
DEV = os.path.join(ROOT, "Halloween email copy by dev.md")

# Group order in the page. emails.json carries each email's group.
GROUPS = ["Best 6", "Top picks", "Hotspots & editing", "Presenting the model", "Speed & controls",
          "3D & AR Analytics", "Files & CAD", "Trial & trust", "WooCommerce"]

# Dev-written emails: nav name and segment, in file order. They have no subject lines yet.
DEV_META = [("3D Analytics", "Any site"), ("Hotspots overview", "Any site"), ("Dimensions ruler", "Any site"),
            ("Multi-model gallery", "Any site"), ("Personalization", "WooCommerce"), ("Upgrade recap", "Any site"),
            ("Configurator vs photos", "WooCommerce"), ("Mobile poster mode", "Any site"), ("Cloud storage", "Any site"),
            ("White-model fix", "Any site"), ("Control layout", "Any site")]

# Best 6, in send order. "d2" = dev email 2; a number = position in emails.json (1-based).
BEST = ["d2", "d3", "d8", 10, "d7", 15]

BANNED = ["hurry", "last chance", "don't miss", "halloween", "black friday", "cyber monday",
          "% off", "discount", "http", "www.", "contact us", "!", "colour", "personalise", "microplugins"]


def words(s):
    return len(s.split())


ours = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "emails.json")))
for i, e in enumerate(ours, 1):
    e["key"] = i

dev = []
chunks = re.split(r"^# Email \d+\s*$", open(DEV).read(), flags=re.M)[1:]
for i, (chunk, (feat, seg)) in enumerate(zip(chunks, DEV_META), 1):
    ls = [l.strip().replace("\\", "") for l in chunk.strip().splitlines() if l.strip() not in ("", "Body", "#")]
    dev.append(dict(key=f"d{i}", feature=feat, segment=seg, subject="", preview=ls[0], paragraphs=ls[1:],
                    cta_text="Upgrade to Pro", group="Top picks", source="dev"))

# Dev emails join Top picks right after our 20
last_top = max(i for i, e in enumerate(ours) if e["group"] == "Top picks")
pool = ours[:last_top + 1] + dev + ours[last_top + 1:]
by_key = {e["key"]: e for e in pool}
for k in BEST:
    by_key[k]["group"] = "Best 6"
emails = [by_key[k] for k in BEST] + [e for e in pool if e["key"] not in BEST]

problems = []
for n, e in enumerate(emails, 1):
    e["n"] = n
    body = " ".join(e["paragraphs"])
    e["total"], e["longest"] = words(body), max(words(p) for p in e["paragraphs"])
    if e["total"] > 150: problems.append(f"#{n} body {e['total']} words")
    if e["longest"] > 40: problems.append(f"#{n} paragraph {e['longest']} words")
    if len(e["subject"]) > 55: problems.append(f"#{n} subject {len(e['subject'])} chars")
    if not e["subject"]: problems.append(f"#{n} has no subject line")
    if "[END DATE]" in body: problems.append(f"#{n} mentions [END DATE]")
    low = (body + " " + e["subject"] + " " + e["preview"]).lower()
    for b in BANNED:
        if b in low: problems.append(f"#{n} contains '{b}'")

print(f"{len(emails)} emails")
for p in problems: print("  !", p)
if "--check" in sys.argv: sys.exit(0)

esc = html.escape


def plain(e):
    lines = [f"Subject: {e['subject'] or '[SUBJECT]'}", f"Preview: {e['preview']}", ""]
    lines += [p + "\n" for p in e["paragraphs"]]
    lines += [f"{e['cta_text']}: [UPGRADE_URL]", "", "[SENDER NAME]", "bPlugins"]
    return "\n".join(lines)


def email_html(e):
    ps = "".join(f'<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#111827;">{esc(p)}</p>' for p in e["paragraphs"])
    return (f'<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;">'
            f'{ps}<p style="margin:6px 0 18px;"><a href="[UPGRADE_URL]" style="display:inline-block;background:#146ef5;color:#ffffff;'
            f'text-decoration:none;font-weight:600;font-size:16px;padding:12px 22px;border-radius:6px;">{esc(e["cta_text"])}</a></p>'
            f'<p style="margin:0;font-size:15px;color:#374151;">[SENDER NAME]<br>bPlugins</p></div>')


def gid(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


nav, cards = [], []
for gname in GROUPS:
    items = [e for e in emails if e["group"] == gname]
    if not items:
        continue
    nav.append(f'<div class="nav-group" data-group="{gid(gname)}"><div class="nav-head">{esc(gname)} <span>{len(items)}</span></div>')
    for e in items:
        nav.append(f'<a class="nav-item" href="#e{e["n"]}" data-text="{esc((e["feature"] + " " + e["subject"] + " " + e["preview"]).lower())}">'
                   f'<b>{e["n"]:02d}</b><span><em>{esc(e["feature"])}</em><small>{esc(e["subject"] or e["preview"])}</small></span></a>')
    nav.append("</div>")
    cards.append(f'<h2 class="group-title" id="g-{gid(gname)}">{esc(gname)}</h2>')
    for e in items:
        seg = "woo" if e["segment"] == "WooCommerce" else "any"
        body = "".join(f"<p>{esc(p)}</p>" for p in e["paragraphs"])
        subject = esc(e["subject"]) if e["subject"] else '<span class="missing">No subject line yet</span>'
        devtag = '<span class="tag dev">Dev copy</span>' if e.get("source") == "dev" else ""
        cards.append(f'''
<article class="email" id="e{e["n"]}">
  <header class="email-top">
    <span class="num">Email {e["n"]:02d}</span>
    <span class="tag {seg}">{esc(e["segment"])}</span>{devtag}
    <span class="feat">{esc(e["feature"])}</span>
    <span class="wc" title="Body words / longest paragraph">{e["total"]} words · longest ¶ {e["longest"]}</span>
  </header>
  <div class="field"><div class="label">Subject line</div><div class="subject">{subject}</div></div>
  <div class="field"><div class="label">Preview text</div><div class="preview">{esc(e["preview"])}</div></div>
  <div class="label">Body</div>
  <div class="body">{body}
    <p><a class="cta" href="[UPGRADE_URL]">{esc(e["cta_text"])}</a></p>
    <p class="sig">[SENDER NAME]<br>bPlugins</p>
  </div>
  <div class="actions">
    <button type="button" data-copy="plain">Copy plain text</button>
    <button type="button" data-copy="html">Copy email HTML</button>
    <button type="button" data-copy="subject">Copy subject</button>
  </div>
  <textarea hidden class="src-plain">{esc(plain(e))}</textarea>
  <textarea hidden class="src-html">{esc(email_html(e))}</textarea>
  <textarea hidden class="src-subject">{esc(e["subject"])}</textarea>
</article>''')

woo = sum(1 for e in emails if e["segment"] == "WooCommerce")
page = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>3D Viewer Pro Emails</title>
<style>
:root {{ --bg:#f3f4f6; --panel:#ffffff; --line:#e5e7eb; --text:#111827; --muted:#6b7280; --soft:#374151; --brand:#146ef5; --brand-soft:#e8f0fe; --woo:#7f54b3; --woo-soft:#f3edfa; --any-soft:#e7f6ee; --any:#137a43; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#0f1115; --panel:#181b21; --line:#2a2f38; --text:#e7e9ee; --muted:#9aa3b2; --soft:#c3c8d2; --brand:#4b8df8; --brand-soft:#1c2a44; --woo:#b892e6; --woo-soft:#2a2140; --any-soft:#16301f; --any:#6fd39a; }} }}
:root[data-theme="dark"] {{ --bg:#0f1115; --panel:#181b21; --line:#2a2f38; --text:#e7e9ee; --muted:#9aa3b2; --soft:#c3c8d2; --brand:#4b8df8; --brand-soft:#1c2a44; --woo:#b892e6; --woo-soft:#2a2140; --any-soft:#16301f; --any:#6fd39a; }}
* {{ box-sizing:border-box; }}
html {{ scroll-behavior:smooth; scroll-padding-top:16px; }}
body {{ margin:0; background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.55; }}
.layout {{ display:grid; grid-template-columns:300px 1fr; min-height:100vh; }}
aside {{ position:sticky; top:0; height:100vh; overflow-y:auto; background:var(--panel); border-right:1px solid var(--line); padding:20px 14px 40px; }}
aside h1 {{ font-size:16px; margin:0 4px 4px; }}
aside .sub {{ font-size:12.5px; color:var(--muted); margin:0 4px 14px; }}
#q {{ width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:8px; background:var(--bg); color:var(--text); font-size:14px; margin-bottom:12px; }}
.nav-head {{ font-size:11.5px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); margin:16px 6px 6px; display:flex; justify-content:space-between; }}
.nav-group[data-group="best-6"] .nav-head {{ color:var(--brand); font-weight:700; }}
.nav-item {{ display:flex; gap:10px; padding:7px 8px; border-radius:7px; text-decoration:none; color:var(--text); }}
.nav-item:hover {{ background:var(--bg); }}
.nav-item.active {{ background:var(--brand-soft); }}
.nav-item b {{ font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums; padding-top:2px; }}
.nav-item span {{ display:flex; flex-direction:column; min-width:0; }}
.nav-item em {{ font-style:normal; font-size:14px; font-weight:600; }}
.nav-item small {{ font-size:12.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
main {{ padding:28px 24px 80px; min-width:0; }}
.wrap {{ max-width:640px; margin:0 auto; }}
.intro {{ background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:18px 22px; font-size:14.5px; color:var(--soft); }}
.intro h2 {{ margin:0 0 8px; font-size:20px; color:var(--text); }}
.intro ul {{ margin:8px 0 0; padding-left:18px; }}
.intro code {{ background:var(--bg); padding:1px 5px; border-radius:4px; font-size:13px; }}
.group-title {{ font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin:36px 0 12px; }}
#g-best-6 {{ color:var(--brand); }}
.email {{ background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:22px 24px; margin-bottom:22px; }}
.email-top {{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:14px; }}
.num {{ font-weight:700; font-size:14px; }}
.tag {{ font-size:12px; padding:2px 8px; border-radius:999px; font-weight:600; }}
.tag.any {{ background:var(--any-soft); color:var(--any); }}
.tag.woo {{ background:var(--woo-soft); color:var(--woo); }}
.tag.dev {{ background:var(--brand-soft); color:var(--brand); }}
.feat {{ font-size:13px; color:var(--muted); }}
.wc {{ margin-left:auto; font-size:12px; color:var(--muted); font-variant-numeric:tabular-nums; }}
.label {{ font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin:12px 0 3px; }}
.subject {{ font-size:18px; font-weight:700; }}
.missing {{ font-weight:400; font-style:italic; color:var(--muted); }}
.preview {{ font-size:15px; color:var(--soft); }}
.body p {{ font-size:16px; margin:0 0 14px; }}
.cta {{ display:inline-block; background:var(--brand); color:#fff; text-decoration:none; font-weight:600; padding:11px 20px; border-radius:6px; }}
.sig {{ font-size:15px; color:var(--soft); }}
.actions {{ display:flex; flex-wrap:wrap; gap:8px; border-top:1px solid var(--line); padding-top:14px; margin-top:6px; }}
.actions button {{ font:inherit; font-size:13px; padding:6px 12px; border:1px solid var(--line); background:var(--bg); color:var(--text); border-radius:6px; cursor:pointer; }}
.actions button.done {{ border-color:var(--any); color:var(--any); }}
.menu-btn {{ display:none; }}
@media (max-width: 860px) {{
  .layout {{ grid-template-columns:1fr; }}
  aside {{ position:fixed; inset:0 auto 0 0; width:min(320px,86vw); z-index:20; transform:translateX(-100%); transition:transform .2s; box-shadow:0 0 40px rgba(0,0,0,.25); }}
  aside.open {{ transform:none; }}
  .menu-btn {{ display:inline-block; position:sticky; top:10px; z-index:10; font:inherit; font-size:14px; padding:8px 14px; border-radius:8px; border:1px solid var(--line); background:var(--panel); color:var(--text); margin-bottom:14px; }}
  main {{ padding:16px 16px 60px; }}
  .email {{ padding:18px 16px; }}
  .wc {{ margin-left:0; width:100%; }}
}}
</style>
</head>
<body>
<div class="layout">
<aside id="side">
  <h1>3D Viewer Pro emails</h1>
  <p class="sub">{len(emails)} emails · {len(emails) - woo} any site · {woo} WooCommerce</p>
  <input id="q" type="search" placeholder="Filter by feature or subject">
  {"".join(nav)}
</aside>
<main>
<div class="wrap">
  <button class="menu-btn" type="button" id="menu">☰ Emails</button>
  <section class="intro">
    <h2>Free → Pro feature emails</h2>
    Each email: optional question, problem, solution, benefit, then 3D Viewer Pro. One feature (or a couple of small ones) per email, one link (the CTA), body up to ~150 words, paragraphs up to ~40 words.
    <ul>
      <li>Fill in before sending: <code>[UPGRADE_URL]</code> and <code>[SENDER NAME]</code>. Emails marked "Dev copy" still need a subject line.</li>
      <li>No seasonal theme or discount in the body, so these work in any campaign; put an offer in the subject line if needed.</li>
      <li>WooCommerce emails are framed for readers whose store runs on WooCommerce. Send them to that segment only.</li>
    </ul>
  </section>
  {"".join(cards)}
</div>
</main>
</div>
<script>
const side = document.getElementById('side');
document.getElementById('menu').onclick = () => side.classList.toggle('open');
side.addEventListener('click', e => {{ if (e.target.closest('.nav-item')) side.classList.remove('open'); }});
document.getElementById('q').addEventListener('input', e => {{
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.nav-group').forEach(g => {{
    let shown = 0;
    g.querySelectorAll('.nav-item').forEach(a => {{ const ok = !q || a.dataset.text.includes(q); a.style.display = ok ? '' : 'none'; shown += ok; }});
    g.style.display = shown ? '' : 'none';
  }});
}});
document.addEventListener('click', async e => {{
  const b = e.target.closest('button[data-copy]'); if (!b) return;
  const src = b.closest('.email').querySelector('.src-' + b.dataset.copy).value;
  try {{
    if (b.dataset.copy === 'html' && window.ClipboardItem) {{
      await navigator.clipboard.write([new ClipboardItem({{'text/html': new Blob([src], {{type:'text/html'}}), 'text/plain': new Blob([src], {{type:'text/plain'}})}})]);
    }} else {{ await navigator.clipboard.writeText(src); }}
    const t = b.textContent; b.textContent = 'Copied'; b.classList.add('done');
    setTimeout(() => {{ b.textContent = t; b.classList.remove('done'); }}, 1400);
  }} catch (err) {{ b.textContent = 'Copy failed'; }}
}});
const links = [...document.querySelectorAll('.nav-item')];
const io = new IntersectionObserver(es => es.forEach(en => {{
  if (!en.isIntersecting) return;
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
}}), {{ rootMargin: '-20% 0px -70% 0px' }});
document.querySelectorAll('.email').forEach(el => io.observe(el));
</script>
</body>
</html>'''
open(OUT, "w").write(page)
print("wrote", OUT)
