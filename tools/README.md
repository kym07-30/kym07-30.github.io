# 시세 페이지 업데이트 방법

1. 구글 시트 `진산마을 가능물건` 탭을 두 번 읽는다 (Google Sheets 커넥터 `get_spreadsheet`, 범위 `'진산마을 가능물건'!A1:AE400`).
   - 값: fields = `sheets.data.startRow`, `sheets.data.startColumn`, `sheets.data.rowData.values.formattedValue`
   - 배경색: fields = `sheets.data.startRow`, `sheets.data.startColumn`, `sheets.data.rowData.values.userEnteredFormat.backgroundColor`
   - 결과가 커서 파일로 저장되면 그 파일 경로를 쓴다.
2. `python3 tools/extract_sheet.py <값 파일> <배경색 파일> /tmp/data.json`
   - `data.json`은 개별 매물 원본이라 저장소에 올리지 않는다 (.gitignore).
3. (선택) 국토부 실거래: 브라우저로 `https://rt.molit.go.kr/pt/xls/xls.do?mobileAt=`를 새로 열고 `tools/rt_fetch.js` 내용을 그대로 실행 → 나온 JSON에 `"_asof": "<오늘 날짜>"`를 넣어 `tools/rt.json`에 저장. 브라우저를 못 쓰면 기존 `rt.json`을 그대로 쓴다.
4. `python3 tools/build_site.py /tmp/data.json <오늘 날짜 YYYY-MM-DD>` → `index.html`, `history/<날짜>.json` 생성.
5. 커밋하고 `main`에 푸시. 1~2분 뒤 https://kym07-30.github.io 에 반영된다.

페이지에 넣지 않는 것: 부동산 이름, 접수일, 메모 원문, 정확한 층(저·중·고층만), 공동중개 등 중개 관련 문구.
