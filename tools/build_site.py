"""공개용 시세 페이지 만들기.
입력: data.json(시트에서 뽑은 매물), rt.json(국토부 실거래 요약), 저장소 history/*.json(날짜별 호가 기록)
출력: 저장소 index.html, history/<기준일>.json
"""
import json, re, os, glob, statistics as st, datetime as dt, sys

# 사용: python3 tools/build_site.py <data.json> <기준일 YYYY-MM-DD>
TOOLS = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(TOOLS)
ASOF = sys.argv[2]
asof = dt.date.fromisoformat(ASOF)

data = json.load(open(sys.argv[1]))
rt = json.load(open(f"{TOOLS}/rt.json"))
base = open(f"{TOOLS}/site_base.html").read()

# 시트 평형 묶음 → 국토부 단지|전용㎡ 키
RT_MAP = {
    "삼성5차 34평": [("삼성5차|84", "")],
    "삼성5차 44평": [("삼성5차|114", "")],
    "삼성5차 50평": [("삼성5차|128", "")],
    "삼성5차 59평": [("삼성5차|155", "")],
    "푸르지오 34·43평": [("푸르지오|85", "34평"), ("푸르지오|115", "43평")],
    "삼성6차·7차 51·53평": [("삼성6차|135", "삼성6차"), ("삼성7차|134", "삼성7차"), ("삼성7차|136", "삼성7차")],
    "삼성6차·7차 63·64평": [("삼성6차|165", "삼성6차"), ("삼성7차|165", "삼성7차")],
    "삼성7차 75평": [("삼성7차|198", "")],
    "삼성7차 85평": [("삼성7차|225", "")],
    "성원상떼빌 24/18평": [("성원상떼빌|60", "")],
    "성원상떼빌 32/25평": [("성원상떼빌|85", "")],
    "성원상떼빌 48/40평": [("성원상떼빌|133", "")],
}

def num(p):
    m = re.match(r"\s*(\d+(?:\.\d+)?)", str(p)); return float(m.group(1)) if m else None
def down(x):
    n = re.findall(r"\d+(?:\.\d+)?", x.get("x", "")); return len(n) >= 2 and float(n[-1]) < float(n[0])
def band(f):
    f = str(f or ""); head, _, tot = f.partition("/")
    head = head.strip(); tot = int(re.sub(r"\D", "", tot) or 0)
    if head[:1] in "저중고": return {"저": "저층", "중": "중층", "고": "고층"}[head[:1]]
    if head.isdigit() and tot and int(head) <= tot:
        r = int(head) / tot
        return "저층" if r <= 1/3 else ("중층" if r <= 2/3 else "고층")
    return "-"
def agg(a):
    if not a: return None
    a = sorted(a); return {"n": len(a), "min": a[0], "med": round(st.median(a), 2), "max": a[-1]}

groups = {}
for x in data:
    g = groups.setdefault(x["g"], {"g": x["g"], "k": x["k"], "sale": [], "jeon": [], "wol": 0, "new": 0, "down": 0})
    if x["t"] == "매매" and num(x["p"]) is not None: g["sale"].append(num(x["p"]))
    elif x["t"] == "전세" and num(x["p"]) is not None: g["jeon"].append(num(x["p"]))
    elif x["t"] == "월세": g["wol"] += 1
    g["new"] += x["n"]; g["down"] += down(x)

# 오늘 스냅샷 저장 + 30일 전 기록 찾기
os.makedirs(f"{REPO}/history", exist_ok=True)
snap = {g["g"]: {"sale": agg(g["sale"]), "jeon": agg(g["jeon"])} for g in groups.values()}
snap_tot = len(data)
json.dump({"date": ASOF, "total": snap_tot, "groups": snap}, open(f"{REPO}/history/{ASOF}.json", "w"), ensure_ascii=False, indent=1)
prev = None
for f in sorted(glob.glob(f"{REPO}/history/*.json")):
    d = dt.date.fromisoformat(os.path.basename(f)[:10])
    if 25 <= (asof - d).days <= 40: prev = json.load(open(f))  # 30일 전후 가장 최근 기록
hist_start = min(os.path.basename(f)[:10] for f in glob.glob(f"{REPO}/history/*.json"))

out = []
for g in sorted(groups.values(), key=lambda g: g["k"]):
    cx, py = g["g"].rsplit(" ", 1)
    o = {"g": g["g"], "cx": cx, "py": py, "sale": agg(g["sale"]), "jeon": agg(g["jeon"]), "wol": g["wol"], "new": g["new"], "down": g["down"], "rt": []}
    if prev and g["g"] in prev["groups"]:
        o["prev"] = {t: (prev["groups"][g["g"]][t] or {}).get("med") for t in ("sale", "jeon")}
    for key, lab in RT_MAP.get(g["g"], []):
        if key in rt:
            o["rt"].append({"lab": lab, "area": key.split("|")[1], **rt[key]})
    out.append(o)

listings = [{"g": x["g"], "t": x["t"], "d": x["d"], "b": band(x["f"]), "p": x["p"], "x": x["x"], "n": x["n"],
             "dn": 1 if down(x) else 0, "se": 1 if re.search(r"세\s*안\s*고", x.get("m", "")) else 0} for x in data]
tot = {"sale": sum(1 for x in data if x["t"] == "매매"), "jeon": sum(1 for x in data if x["t"] == "전세"),
       "wol": sum(1 for x in data if x["t"] == "월세"), "new": sum(x["n"] for x in data), "down": sum(1 for x in data if down(x))}
payload = {"asof": ASOF, "rtAsof": rt.get("_asof"), "prevDate": prev["date"] if prev else None, "histStart": hist_start, "groups": out, "tot": tot, "list": listings}

head = base[:base.index('  <p class="note">')]
phone_js = base[base.index("  // 전화 버튼"):base.index("  render();\n})();")]
y, m, d = ASOF.split("-")
head = re.sub(r"호가 기준 · \d+년 \d+월 \d+일 집계", f"호가 기준 · {y}년 {int(m)}월 {int(d)}일 집계", head)

css = open(f"{TOOLS}/extra.css").read()
body = open(f"{TOOLS}/body.html").read()
js = open(f"{TOOLS}/app.js").read().replace("__DATA__", json.dumps(payload, ensure_ascii=False))
page = head.replace("</head>", "<style>\n" + css + "\n</style>\n</head>", 1) + body + "<script>\n(function(){\n" + js + phone_js + "  render();\n})();\n</script>\n</body>\n</html>\n"
open(f"{REPO}/index.html", "w").write(page)
print("ok", len(page), "prev:", payload["prevDate"], "groups:", len(out), "listings:", len(listings))
