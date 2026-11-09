// 국토부 실거래가 공개시스템(https://rt.molit.go.kr/pt/xls/xls.do?mobileAt=) 페이지에서 javascript_tool로 그대로 실행.
// 결과 JSON 문자열을 tools/rt.json에 저장하면 된다. (최근 1년, 해제 거래 제외, 월세 제외)
const want = {'진산마을삼성5차':'삼성5차','진산마을삼성6차':'삼성6차','진산마을삼성7차':'삼성7차','수지진산마을푸르지오':'푸르지오','진산마을성원상떼빌아파트':'성원상떼빌'};
const sel = async (id, text) => { const s = $(id); s.val(s.find('option').filter((i,o)=>o.text===text).val()).trigger('change'); await new Promise(r=>setTimeout(r,1500)); };
await sel('#srhSidoCd','경기도'); await sel('#srhSggCd','용인시 수지구');
const parse = l => { const o=[]; const re=/"((?:[^"]|"")*)"/g; let m; while((m=re.exec(l))) o.push(m[1]); return o; };
async function grab(delng, emd){
  await sel('#srhEmdCd', emd); $('#srhDelngSecd').val(delng);
  $('#sidoNm').val('경기도'); $('#sggNm').val('용인시 수지구'); $('#emdNm').val(emd); $('#hsmpNm').val('전체');
  const data = $('#frm_xls').serialize(), h = {'Content-Type':'application/x-www-form-urlencoded'};
  await fetch('/pt/xls/ptXlsDownDataCheck.do', {method:'POST', headers:h, body:data});
  const txt = new TextDecoder('euc-kr').decode(await (await fetch('/pt/xls/ptXlsCSVDown.do', {method:'POST', headers:h, body:data})).arrayBuffer());
  const lines = txt.split('\n'), hi = lines.findIndex(l=>l.startsWith('"NO"'));
  return lines.slice(hi+1).filter(Boolean).map(parse);
}
const res = [];
for (const emd of ['풍덕천동','상현동']){
  (await grab('1', emd)).filter(r=>want[r[5]] && r[16]==='-').forEach(r=>res.push([want[r[5]],'s',+r[6],+(r[7].slice(2)+r[8]),+r[9].replace(/,/g,''),+r[11]]));
  (await grab('2', emd)).filter(r=>want[r[5]] && r[6]==='전세').forEach(r=>res.push([want[r[5]],'j',+r[7],+(r[8].slice(2)+r[9]),+r[10].replace(/,/g,''),+r[12]]));
}
const today = new Date(), cut = new Date(today.getFullYear(), today.getMonth()-3, today.getDate());
const c3 = +((cut.getFullYear()%100)*10000 + (cut.getMonth()+1)*100 + cut.getDate());
const med = a => { a=[...a].sort((x,y)=>x-y); const m=a.length>>1; return a.length%2 ? a[m] : Math.round((a[m-1]+a[m])/2); };
const g = {};
for (const [n,t,ar,d,p,fl] of res){ const k=n+'|'+Math.round(ar); ((g[k]=g[k]||{})[t]=g[k][t]||[]).push([d,p,fl]); }
const out = {};
for (const [k,o] of Object.entries(g)) for (const [t,a] of Object.entries(o)){
  a.sort((x,y)=>y[0]-x[0]); const r3=a.filter(x=>x[0]>=c3).map(x=>x[1]);
  (out[k]=out[k]||{})[t] = {n:a.length, hi:Math.max(...a.map(x=>x[1])), m3:r3.length?med(r3):null, c3:r3.length, last:a.slice(0,6)};
}
JSON.stringify(out)
