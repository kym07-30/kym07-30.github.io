"""구글 시트 '진산마을 가능물건' 탭 → 공개용 매물 데이터(data.json)
사용: python3 extract_sheet.py <값 파일> <배경색 파일> <출력 data.json>
 - 값 파일: get_spreadsheet(ranges=["'진산마을 가능물건'!A1:AE400"], fields=[sheets.data.startRow, sheets.data.startColumn, sheets.data.rowData.values.formattedValue]) 결과
 - 배경색 파일: 같은 범위, fields=[..., sheets.data.rowData.values.userEnteredFormat.backgroundColor] 결과
부동산 이름·접수일은 넣지 않는다. 보라·노랑 칠한(빠진) 매물은 뺀다. 파랑 = 이번 주 신규.
"""
import json, re, sys

def load(p):
    t = json.load(open(p))
    if isinstance(t, dict) and "sheets" not in t:
        for k in ("result", "payload", "content"):
            if k in t: t = t[k] if isinstance(t[k], dict) else json.loads(t[k])
    return t["sheets"][0]["data"][0]

vals, cols = load(sys.argv[1]), load(sys.argv[2])
rows = [[(v.get("formattedValue") or "").strip() for v in r.get("values", [])] for r in vals.get("rowData", [])]

def kind(c):
    if not c: return None
    r, g, b = c.get("red", 0), c.get("green", 0), c.get("blue", 0)
    if r > .95 and g > .95 and b > .95: return None
    if r > .75 and g > .75 and b < .5: return "yellow"
    if b > .6 and r > .45 and g < .55: return "purple"
    if b > .6 and r < .45: return "blue"
    return None
colors = [[kind(((v or {}).get("userEnteredFormat") or {}).get("backgroundColor")) for v in r.get("values", [])] for r in cols.get("rowData", [])]

def status(r, s):
    line = colors[r] if r < len(colors) else []
    blue = False
    for c in range(s - 1, s + 10):
        k = line[c] if 0 <= c < len(line) else None
        if k in ("purple", "yellow"): return "gone"
        if k == "blue": blue = True
    return "new" if blue else None

out = []
for s in (1, 11, 21):
    group = None; typ = "매매"
    for r, row in enumerate(rows):
        c = lambda k: row[s + k] if s + k < len(row) else ""
        a, b = c(0), c(1)
        if not a and not b: continue
        if b == "구분": typ = a or "매매"; continue
        if a in ("매매", "전세", "월세") and not b: typ = a; continue
        if a and b and not c(2) and not c(3) and not c(4):
            group = {"size": a, "name": b, "key": r * 100 + s, "items": []}; typ = "매매"; continue
        if not b or not group: continue
        it = {"row": r, "s": s, "g": group, "gubun": b, "dong": c(2), "floor": c(3), "price": c(4), "memo": c(5), "note": c(8), "type": typ}
        group["items"].append(it); out.append(it)

fix = lambda s: re.sub(r"진\s*(\d)[\s.]*", lambda m: "삼성%s차 " % m.group(1), s).strip().replace("삼성6차 ·삼성7차", "삼성6차·7차")
seen = set()
for it in out:
    g = it["g"]
    if id(g) in seen: continue
    seen.add(id(g))
    size = re.sub(r"[.,]", "·", g["size"])
    if g["name"] == "가능":
        cx = sorted({re.sub(r"\s", "", m.group(0)) for x in g["items"] for m in [re.match(r"^진\s*\d", x["gubun"])] if m})
        g["label"] = fix(("·".join(cx) + " " if cx else "") + size + "평")
    else:
        g["label"] = g["name"] + " " + size + "평"

pub = []; gone = 0
for it in out:
    st = status(it["row"], it["s"])
    if st == "gone": gone += 1; continue
    note = it["note"]
    chg = note if note and re.search(r"[>~→-]", note) and not re.match(r"^\d{6}", note) else ""
    chg = chg.replace("->", "→").replace(">", "→")
    pub.append({"g": it["g"]["label"], "k": it["g"]["key"], "t": it["type"], "c": fix(it["gubun"]), "d": it["dong"], "f": it["floor"],
                "p": it["price"], "m": it["memo"], "x": chg, "n": 1 if st == "new" else 0})
json.dump(pub, open(sys.argv[3], "w"), ensure_ascii=False)
print(f"매물 {len(out)}건 중 빠진 매물 {gone}건 제외 → {len(pub)}건, 신규 {sum(p['n'] for p in pub)}건", file=sys.stderr)
