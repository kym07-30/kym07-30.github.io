  const D = __DATA__;
  const $ = id => document.getElementById(id);
  document.addEventListener("contextmenu", e => e.preventDefault());
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  let T = "sale", CX = "전체";
  const TL = {sale: "매매", jeon: "전세"};
  function eok(n){ const e = Math.floor(n + 1e-9), m = Math.round((n - e) * 10000); return m ? (e ? e + "억 " : "") + m.toLocaleString("ko-KR") + "만" : e + "억"; }
  const short = n => (Math.round(n * 100) / 100) + "억";
  const man = v => eok(v / 10000);
  const dstr = v => { const s = String(v); return s.slice(0,2) + "." + s.slice(2,4) + "." + s.slice(4,6); };
  const md = s => { const [y,m,d] = s.split("-"); return `${+m}/${+d}`; };
  const isNum = v => /^\d+(\.\d+)?$/.test(String(v).trim());

  $("srcAsof").textContent = `· 호가: 네이버 부동산 등록 매물을 황금1번지가 단지·평형별로 정리했어요 (${D.asof.replace(/-/g, ".")} 기준).` + (D.rtAsof ? ` 실거래는 ${D.rtAsof.replace(/-/g, ".")}에 내려받은 자료예요.` : "");

  function render(){
    const tt = D.tot;
    const tiles = [["sale", "매매", tt.sale], ["jeon", "전세", tt.jeon], ["wol", "월세", tt.wol], ["new", "이번 주 신규", tt.new], ["down", "가격 내림", tt.down]];
    $("stats").innerHTML = tiles.map(([k, l, v]) => `<button type="button" class="stat" data-open="${k}"><div class="k">${l}<i>보기 ›</i></div><div class="v">${v}<small>건</small></div></button>`).join("");
    document.querySelectorAll(".seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === T)));
    const cxs = ["전체", ...Array.from(new Set(D.groups.map(g => g.cx)))];
    $("cxChips").innerHTML = `<span class="lab">단지</span>` + cxs.map(c => `<button type="button" class="chip" data-cx="${esc(c)}" aria-pressed="${c === CX}">${esc(c)}</button>`).join("");
    const list = D.groups.filter(g => g[T] && (CX === "전체" || g.cx === CX));
    if (!list.length){ $("cards").innerHTML = `<div class="empty">이 조건의 호가 정보가 없어요.</div>`; return; }
    const lo = Math.min(...list.map(g => g[T].min)), hi = Math.max(...list.map(g => g[T].max));
    const pos = v => hi === lo ? 50 : 4 + (v - lo) / (hi - lo) * 92;
    $("cards").innerHTML = list.map(g => { const a = g[T];
      // 30일 호가 변화
      let chg;
      if (g.prev && g.prev[T] != null){
        const dlt = Math.round((a.med - g.prev[T]) * 100) / 100;
        chg = `30일 호가 변화 (${md(D.prevDate)} → ${md(D.asof)}) · ${short(g.prev[T])} → ${short(a.med)} ` +
          (dlt > 0 ? `<b class="up">▲${short(dlt)}</b>` : dlt < 0 ? `<b class="dn">▼${short(-dlt)}</b>` : `<b>변동 없음</b>`);
      } else chg = `30일 호가 변화 · ${md(D.histStart)}부터 기록 중이라 한 달 뒤부터 보여드려요`;
      // 국토부 실거래
      const tk = T === "sale" ? "s" : "j";
      const rts = g.rt.filter(r => r[tk]);
      const rtHTML = rts.length ? `<div class="rt"><div class="rh"><span>국토부 실거래</span>${TL[T]} · 최근 1년</div>` + rts.map(r => { const s = r[tk];
          const lab = (r.lab ? r.lab + " " : "") + "전용 " + r.area + "㎡";
          const main = s.m3 ? `최근 3개월 중간값 <b>${man(s.m3)}</b> <small>(${s.c3}건)</small>` : `최근 3개월 거래 없음`;
          return `<div class="rv">${rts.length > 1 || r.lab ? `<div class="sub">${esc(lab)}</div>` : ""}${main}<br><small>1년 ${s.n}건 · 최고 ${man(s.hi)}</small></div>
            <details><summary>최근 거래 ${s.last.length}건 보기</summary><ul>${s.last.map(x => `<li><span class="dt">${dstr(x[0])}</span><span>${x[2]}층</span><span>${man(x[1])}</span></li>`).join("")}</ul></details>`; }).join("") +
        (rts.length === 1 && !rts[0].lab ? `<div class="sub">전용 ${rts[0].area}㎡ 기준</div>` : "") + `</div>` : "";
      const cnt = D.list.filter(x => x.g === g.g && x.t === TL[T]).length;
      return `<article class="mk">
        <h2>${esc(g.cx)} <small>${esc(g.py)}</small></h2>
        <div class="med">${eok(a.med)}<span>중간 호가</span></div>
        <div class="rng" aria-hidden="true"><div class="bar" style="left:${pos(a.min)}%;right:${100 - pos(a.max)}%"></div><div class="dot" style="left:${pos(a.med)}%"></div></div>
        <div class="rlab"><span>최저 <b>${short(a.min)}</b></span><span>최고 <b>${short(a.max)}</b></span></div>
        <div class="chg30">${chg}</div>
        <div class="tags"><span class="tag">${TL[T]} 호가 ${a.n}건</span>${g.wol && T === "jeon" ? `<span class="tag">월세 ${g.wol}건</span>` : ""}${g.new ? `<span class="tag new">이번 주 신규 ${g.new}</span>` : ""}${g.down ? `<span class="tag dn">가격 내림 ${g.down}</span>` : ""}</div>
        ${rtHTML}
        ${cnt ? `<button type="button" class="more" data-grp="${esc(g.g)}">${TL[T]} 매물 ${cnt}건 보기 ›</button>` : ""}
      </article>`; }).join("");
  }

  // ---------- 매물 목록 창 ----------
  const OPEN = {
    sale: ["매매 매물", x => x.t === "매매"], jeon: ["전세 매물", x => x.t === "전세"], wol: ["월세 매물", x => x.t === "월세"],
    new: ["이번 주 신규 매물", x => x.n], down: ["가격 내린 매물", x => x.dn]
  };
  function openList(title, fn, showType){
    const rows = D.list.filter(fn);
    const order = D.groups.map(g => g.g);
    const byG = new Map();
    rows.forEach(x => { if (!byG.has(x.g)) byG.set(x.g, []); byG.get(x.g).push(x); });
    const tOrd = {"매매": 0, "전세": 1, "월세": 2};
    const pn = x => { const m = String(x.p).match(/\d+(\.\d+)?/); return m ? +m[0] : 1e9; };
    $("pTitle").textContent = title;
    $("pSub").textContent = `${rows.length}건 · ${D.asof.replace(/-/g, ".")} 기준 · 호가(희망가격)`;
    $("pBody").innerHTML = rows.length ? Array.from(byG.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([g, arr]) => {
      arr.sort((a, b) => (tOrd[a.t] ?? 3) - (tOrd[b.t] ?? 3) || pn(a) - pn(b));
      const [cx, py] = [g.slice(0, g.lastIndexOf(" ")), g.slice(g.lastIndexOf(" ") + 1)];
      return `<div class="pg"><h3>${esc(cx)} <small>${esc(py)} · ${arr.length}건</small></h3>` + arr.map(x => `<div class="lrow">
          <span>${x.d ? esc(/^\d+$/.test(x.d) ? x.d + "동" : x.d) : "-"}</span>
          <span class="muted">${esc(x.b)}</span>
          <span class="lp">${isNum(x.p) ? eok(+x.p) : esc(x.p)}${x.x ? `<small>${esc(x.x)}</small>` : ""}</span>
          <span class="lt">${showType ? `<span class="tag">${x.t}</span>` : ""}${x.n ? `<span class="tag new">신규</span>` : ""}${x.dn ? `<span class="tag dn">내림</span>` : ""}${x.se ? `<span class="tag">세안고</span>` : ""}</span>
        </div>`).join("") + `</div>`; }).join("") : `<div class="empty">해당 매물이 없어요.</div>`;
    $("panelBg").hidden = false; $("pBody").scrollTop = 0;
  }
  function closeList(){ $("panelBg").hidden = true; }
  $("stats").addEventListener("click", e => { const b = e.target.closest("button[data-open]"); if (b){ const k = b.dataset.open, [t, fn] = OPEN[k]; openList(t, fn, k === "new" || k === "down"); } });
  $("cards").addEventListener("click", e => { const b = e.target.closest("button[data-grp]"); if (b){ const g = b.dataset.grp; openList(`${g} ${TL[T]} 매물`, x => x.g === g && x.t === TL[T]); } });
  $("pClose").addEventListener("click", closeList);
  $("panelBg").addEventListener("click", e => { if (e.target === $("panelBg")) closeList(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("panelBg").hidden) closeList(); });
  document.querySelector(".seg").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b){ T = b.dataset.t; render(); } });
  $("cxChips").addEventListener("click", e => { const b = e.target.closest("button[data-cx]"); if (b){ CX = b.dataset.cx; render(); } });
