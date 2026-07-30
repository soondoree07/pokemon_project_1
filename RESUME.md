# 진행 상황 (2026-07-12 KST 기준)

> 트리거(`포케노바`/`pokenova`) 시 이 파일을 **가장 먼저** 읽고 이어간다.

## 이 프로젝트가 뭐냐 (한 줄)

포케노바 = **정적 HTML 도감 사이트** (pokedex/movedex/itemdex/index/entry/record/today `.html`, 데이터 `data/*.json`, 스프라이트 `sprites/pokemon/`). 서버 없음. **Cloudflare Workers**(정적 자산) 호스팅.

## 2026-07-12 세션 — 이로치 도감 · 로컬 데이터화 · Cloudflare 이전

포켓몬 정보 쇼츠 채널의 첫 콘텐츠(이로치 색상)를 위해 이로치 도감 신설 + pochams API 의존 제거.

1. **이로치 도감 신설** — `pokedex.html`에 `?shiny=1` 파라미터 방식. 네비 "포켓몬 도감" **오른쪽**에 `✨ 이로치 도감`(`pokedex.html?shiny=1`) 추가.
   - `const SHINY = new URLSearchParams(location.search).get('shiny')==='1'` + `spriteOf(p)` 헬퍼로 카드·모달·폼 스프라이트 3곳 분기.
   - `download_shiny_sprites.js`로 PokéAPI official-artwork/shiny **1025마리 전부** 다운로드 → `pokedex.json` 각 항목에 `shinySprite` 필드 추가(백업 `.bak`). **1025/1025 official, 누락 0.**
2. **movedex·itemdex·특성 로컬 데이터화** — pochams API(402로 다운)에 의존하던 fetch를 로컬 파일로 교체. Promise.all fail-fast로 도감 전체가 안 뜨던 문제 해결.
   - pokedex 특성: `data/quiz_abilities.json` / movedex: `data/quiz_moves.json`(L374) / itemdex: `data/quiz_items.json`(L306). 모두 `.catch(()=>[])` 폴백.
   - **포케노바가 이제 데이터 자급자족** — pochams API 없어도 도감 전부 동작.
3. **네비 임시 숨김** — 7개 HTML 전부에서 퀴즈(index)·기록(record)·오늘의포켓몬(today) 네비 링크 주석 처리(`임시숨김`, 복구 쉬움). 현재 노출 네비: 포켓몬 도감·이로치 도감·기술 도감·아이템 도감·배틀팀.
4. **Cloudflare Workers 이전** — Vercel → Cloudflare. 커스텀 도메인 `pokenova.pochams.com` 연결(라이브 200 확인).
   - `_headers`(신규): `/sprites/*` 1년 immutable 캐시.
   - `.assetsignore`(신규): .git·node_modules·*.bak·스크립트·*.py 등 제외 → 25MiB 파일 한도 빌드에러 해결.
   - `_redirects`는 생성했다가 **삭제**(Cloudflare 기본 clean-URL과 충돌해 리다이렉트 루프).

## 2026-07-12 추가 — 이로치 도감 폼 shiny 275/284

- 기본 1025 외에 **폼 284개**도 shiny 채움. `download_form_shiny_sprites.js`(za_ 폼명→PokeAPI 이름 변환 다운로드). 공식243·홈4·base26·necrozma리맵2 = **275/284**.
- **남은 9개**(공식 shiny 아트워크 부재 → 정규 폴백): deerling·sawsbuck 계절 6, frillish·jellicent 암컷 2, **메가냐오닉스**(ZA 신규 메가) 1. 필요하면 나무위키/포켓몬위키에서 수동 확보.
- `build_pokedex.js` 재생성 시 base·폼 `shinySprite` 보존하도록 수정(재실행해도 shiny 안 날아감).

## 2026-07-13 — 이로치 도감 폼 카드가 일반 색으로 뜨던 버그 수정 (커밋 1d7c0d4)

- **증상**: 이로치 도감에 리전폼 이로치가 안 보임. 메가·거다이맥스·합체폼도 같은 증상이었음.
- **데이터는 멀쩡했다** — 폼 `shinySprite` 275개 다 있고 스프라이트 파일도 전부 존재. 파일명이 `master__sprites__..._shiny__10091.png` 꼴이라 잘못 받은 줄 알았지만, 열어보니 정상 이로치 아트워크(PokéAPI 저장소 경로의 `/`를 `__`로 치환한 이름일 뿐).
- **원인은 프론트**: `pokedex.html`이 카드·모달용 엔트리 객체를 만들 때 `sprite`만 복사하고 `shinySprite`를 안 넘겨서 `spriteOf()`가 일반 아트로 폴백. 위 07-12 기록의 "`spriteOf()`가 이미 지원하니 코드 변경 불필요"는 **오판**이었다(엔트리 평탄화 단계를 놓침).
- **수정**: `flattenAll`(리전폼·합체폼) + `renderForms`(메가·거다이) 엔트리 4곳에 `shinySprite` 전달. 특성 모달의 포켓몬 그리드도 `spriteOf()` 경유로 통일.
- **검증**(jsdom 헤드리스): 리전 68/68 · 거다이 33/33 · 메가 92/93 · 합체 63/71 · 기본 1018/1018 이로치 적용. 잔여 9개는 아래 "남은 9개"와 동일(공식 shiny 아트워크 부재).
- ⚠️ **앞으로 폼 관련 필드를 추가하면** `pokedex.html`의 엔트리 생성 지점(리전·합체·메가·거다이 4곳)에도 반드시 같이 넘겨야 한다. 데이터에만 넣으면 화면엔 안 나온다.

## 2026-07-13 — 폼 shiny 284/284 완성 (커밋 cbe764d)

위 "남은 9개(공식 shiny 아트워크 부재)"는 **틀린 결론이었다.** 8개는 PokéAPI에 멀쩡히 있었고, 기존 스크립트가 `official-artwork` 경로만 봐서 못 찾았을 뿐이다.

- **탱그릴·탱탱겔 암컷** → PokéAPI에 **암컷 전용 shiny 필드**가 따로 있다: `other/home/shiny/female/{592,593}.png` (`front_shiny_female`도 존재).
- **사철록·바라철록 계절 6종** → 계절폼은 `pokemon`이 아니라 **`pokemon-form` 엔티티**다. `/api/v2/pokemon-form/deerling-summer` 로 조회. HOME 렌더(512px)라 기존 일반 스프라이트와 해상도·화풍이 딱 맞는다.
- **메가냐오닉스** → ZA 신규라 PokéAPI에 없다. Bulbapedia에도 일반 아트워크뿐(공식 아트워크는 원래 일반 색만 그린다). **Serebii ZA 이로치 렌더** 사용: `https://www.serebii.net/Shiny/ZA/678-m.png` (250px 게임 모델 — 나머지보다 작고 3D 화풍). **ZA 신규 메가 이로치가 더 필요하면 여기가 소스다.**
- 결과: **폼 284/284, 기본 1025/1025, 누락 0.** 라이브 검증 완료.

### 이번에 배운 것 (다음에 헛수고 하지 말 것)

- **"이로치가 안 뜬다" 제보를 받으면 라이브 배포부터 확인하라.** 메가가 안 바뀐다는 제보의 진짜 원인은 데이터가 아니라 **Cloudflare 배포 지연**이었다. `curl -s https://pokenova.pochams.com/pokedex | grep -c "shinySprite: f.shinySprite"` 로 즉시 확인 가능.
- **평균색 비교로 이로치 여부를 판별하지 말 것.** 메가 93개 검사에서 21개가 "색차 거의 없음"으로 잡혔지만 전부 정상이었다. 얼음귀신 메가는 눈 색만 청록→주황으로 바뀌는 등 **변화 면적이 작은 이로치**가 많다. 판별은 파일 md5를 PokéAPI shiny 원본과 대조하는 쪽이 확실하다.
- **포켓몬 이름은 반드시 `data/pokedex.json`에서 확인할 것.** 이번에 바라철록을 "메꾸리", 탱탱겔을 "프리지오"로 잘못 부른 오기가 있었다.

## 2026-07-13 — 이로치 도감을 메인(/)으로, 퀴즈 배포 제외 (커밋 4ccd9e6 · 7cb4ce9)

### 구조가 바뀌었다

- **루트(`/`) = 이로치 도감.** `index.html` 은 **`pokedex.html` 의 자동 생성 사본**이다.
  - ⚠️ **`pokedex.html` 을 고치면 반드시 `node scripts/build_index.js` 를 다시 돌릴 것.** 안 그러면 루트만 옛 버전이 된다.
  - 이로치 모드 판정: `IS_ROOT`(경로가 `/`) **또는** `?shiny=1`. 구 링크 호환 유지.
  - `/pokedex` 는 그대로 일반 도감.
- **퀴즈는 배포 제외.** `index.html` → **`quiz.html`** 로 이름이 바뀌었고 `.assetsignore` 에 등록돼 Cloudflare 에 안 올라간다(`/quiz`·`/quiz.html` 모두 404). **소스는 레포에 그대로 있다.**

### 퀴즈를 내린 이유 (고치면 되살릴 수 있다)

1. **로딩 자체가 실패** — `quiz.html` 이 아직 pochams API(`/api/data/{moves,abilities,items}`)를 쓰는데, 포챔스 DDoS 때 켠 **Vercel 봇 차단**에 걸려 JSON 대신 `429` + Security Checkpoint HTML 이 온다. `r.json()` 실패 → `Promise.all` fail-fast → `loadAllData()` 에 catch 가 없어 퀴즈 5종 전부 로딩에서 멈춘다.
   - **고치는 법**: movedex/itemdex 와 똑같이 로컬 파일로 교체. `data/quiz_moves.json`·`quiz_abilities.json`·`quiz_items.json` 이 이미 있고 필터도 그대로 통과한다. 헤드리스로 확인했을 때 에러 0, 정상 로드됐다.
2. **전체정복 판정 버그 2건**
   - 특성: `aAnsweredSet.add(a.en)` 인데 **혼연일체 2건의 `en` 이 둘 다 `as_one`** → 집합 최대 309 < 조건 310 → 영원히 정복 불가.
   - 포켓몬: `bAnsweredSet.add(p.id)` 인데 **폼이 `base.id` 를 공유**(리자몽·메가X·메가Y·거다이 전부 id=6) → 최대 1025 < 조건 1309. 진행률도 폼을 맞히면 기본형까지 카운트돼 틀린다.
   - **고치는 법**: 정복 판정 키를 고유값(배열 인덱스, 또는 `id + 폼명`)으로 바꾼다.
   - 기술·도구·능력치 퀴즈는 이상 없음. 하드모드 Z기술도 `catastropika` 가 PP 필터에 걸려 빠지므로 충돌 없음.

### ⚠️ `_redirects` 는 쓰지 말 것 (이번에 또 당했다)

`/ → /pokedex.html 200` rewrite 를 넣었더니 **루트가 404** 났다. Cloudflare 정적 자산이 `/pokedex.html` 을 clean-URL(`/pokedex`)로 **307 리다이렉트**하기 때문에 rewrite 대상이 리다이렉트로 튕긴다. 위 07-12 기록의 "`_redirects` 는 clean-URL 과 충돌" 이 바로 이것. **루트에 실물 파일을 두는 방식(`build_index.js`)으로 해결했다.**

## 현재 막힌 지점 / 결정 대기

- 없음. 모든 변경 커밋·푸시 완료(main). Cloudflare가 GitHub main push 시 자동 재배포(반영까지 수 분 걸릴 수 있음).

## 다음 액션 (이어할 작업 후보)

1. **쇼츠 콘텐츠 제작 재개** — 원래 목표였던 이로치 색상 쇼츠(첫 에피소드). TTS는 **Typecast** 방향. (pokemon_trailer_project 쪽 작업 — 현재 쇼츠 라인은 보류)
2. **이로치 도감 UI/UX 다듬기**(요청 시) — 배지/정렬/검색 등.
3. **숨긴 네비 복구**(원할 때) — 7개 HTML의 `임시숨김` 주석 해제.

## 이미 완료된 셋업 / 데이터 파이프라인 (재시도 불필요)

- **데이터 마스터 = `pokenova_project/data/`**. 여기 `pokedex.json`의 `inChampions` true/false가 포챔스 등장 포켓몬을 결정.
- **한 번 업데이트로 둘 다 반영**: `cd pochams_project && npm run sync -- --push` → pokedex.json → 포챔스 브릿지·DB seed(Neon, 즉시 반영) + 포케노바 data 커밋·push(Cloudflare 자동 재배포). 상세는 `pochams_project/scripts/sync-data.sh`.
- 라이브: `https://pokenova.pochams.com/pokedex?shiny=1` (이로치 도감, ✨ 네비).
- 이번 세션 push 커밋: 9ec9716 / e73431c / 8d09e25 / 9de01ad / f74e208 (main).
