/**
 * build_pokedex.js — 포케노바 마스터 도감 데이터 생성기
 *
 * 결과물: data/pokedex.json (전국도감 1025마리 + 폼(메가/리전/거다이맥스 등) + inChampions 플래그)
 *
 * 런타임(도감·메인 퀴즈·오늘의 퀴즈·기술 도감·배틀팀)은 이 파일 하나만 읽는다.
 * 포챔스 API에 의존하지 않는다. 이 스크립트는 데이터가 바뀔 때만 돌리는 개발용 (재)생성 도구다.
 *
 * inChampions = 포챔스 사이트 노출 여부 플래그. 포케노바가 단일 원천(마스터)이다.
 *  - 최초 생성: champions_pokemon_ids.json 값으로 부트스트랩
 *  - 재실행: 기존 pokedex.json에서 손으로 켠 플래그를 그대로 보존 (마스터 플래그를 덮어쓰지 않음)
 *
 * 반대 방향(플래그 → 포챔스)은 pochams_project/scripts/champions_from_pokedex.py 가 담당한다.
 *
 * 소스 (전부 포케노바 자체 파일 — 외부 의존 없음)
 *  - data/quiz_pokemon.json          : 전체 1025 base + ja + 폼(메가/리전/거다이맥스 등)
 *  - data/champions_pokemon_ids.json : inChampions 부트스트랩 값
 *  - data/pokedex.json (있으면)      : 손으로 편집한 inChampions 보존
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// 리전 원종(리전폼이 아닌 히스이 전용 신규 포켓몬) → base 카드에 히스이 뱃지
const HISUI_NATIVE = new Set([899, 900, 901, 902, 903, 904, 905]);
// 메인 카드 ko 표기 오버라이드 (원본에 이미 반영돼 있어도 안전하게 유지)
const KO_OVERRIDE = { 745: "루가루암", 902: "대쓰여너" };

const toAbsolute = (sprite) =>
  !sprite || sprite.startsWith("http") ? sprite : "/" + sprite.replace(/^\/+/, "");

function main() {
  const base = readJson(path.join(DATA, "quiz_pokemon.json")); // 1025, ja + 폼 포함
  const champ = readJson(path.join(DATA, "champions_pokemon_ids.json"));
  const baseIds = new Set(champ.baseIds);
  const altOnly = new Set(champ.altOnlyEns || []);
  const megaOnly = new Set(champ.megaOnlyEns || []);

  // 기존 편집 보존 (pokedex.json이 마스터)
  const prevBase = new Map();
  const prevForm = new Map();
  // 이로치(shiny) 스프라이트 보존 — download_shiny_sprites.js / download_form_shiny_sprites.js 로 채운 값
  const prevBaseShiny = new Map();
  const prevFormShiny = new Map();
  const outPath = path.join(DATA, "pokedex.json");
  if (fs.existsSync(outPath)) {
    for (const p of readJson(outPath)) {
      prevBase.set(p.id, p.inChampions);
      if (p.shinySprite) prevBaseShiny.set(p.id, p.shinySprite);
      for (const f of p.forms || []) {
        if (f.name_en) prevForm.set(f.name_en, f.inChampions);
        if (f.name_en && f.shinySprite) prevFormShiny.set(f.name_en, f.shinySprite);
      }
    }
  }

  let missingSprites = 0;
  const spriteExists = (sprite) =>
    !sprite || sprite.startsWith("http") ||
    fs.existsSync(path.join(ROOT, sprite.replace(/^\/+/, "")));

  const out = base
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((p) => {
      const baseChamp = prevBase.has(p.id) ? prevBase.get(p.id) : baseIds.has(p.id);
      const forms = (p.forms || [])
        .filter((f) => !f.hidden) // 시딩과 동일하게 hidden 폼 제외
        .map((f) => {
          const bootstrap =
            baseIds.has(p.id) || megaOnly.has(f.name_en) || altOnly.has(f.name_en);
          const inChampions = prevForm.has(f.name_en)
            ? prevForm.get(f.name_en)
            : bootstrap;
          if (!spriteExists(f.sprite)) missingSprites++;
          return {
            type: f.type,
            name_ko: f.name_ko,
            name_en: f.name_en,
            sprite: toAbsolute(f.sprite),
            types: f.types || p.types,
            abilities: f.abilities || [],
            ...(f.regionType ? { regionType: f.regionType } : {}),
            inChampions,
            ...(prevFormShiny.has(f.name_en) ? { shinySprite: prevFormShiny.get(f.name_en) } : {}),
          };
        });

      if (!spriteExists(p.sprite)) missingSprites++;
      const entry = {
        id: p.id,
        ko: KO_OVERRIDE[p.id] || p.ko,
        en: p.en,
        ja: p.ja || "",
        sprite: toAbsolute(p.sprite),
        types: p.types,
        abilities: p.abilities || [],
        forms,
        inChampions: baseChamp,
        ...(prevBaseShiny.has(p.id) ? { shinySprite: prevBaseShiny.get(p.id) } : {}),
      };
      if (HISUI_NATIVE.has(p.id)) {
        entry.regionType = "hisui";
        entry.formType = "region";
      }
      return entry;
    });

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  const champCount = out.filter((p) => p.inChampions).length;
  const formCount = out.reduce((n, p) => n + p.forms.length, 0);
  console.log(
    `pokedex.json 생성 완료: base ${out.length}마리 (챔피언 ${champCount}) + 폼 ${formCount}개`
  );
  if (missingSprites) console.warn(`⚠️ 스프라이트 누락 ${missingSprites}개 — sprites/ 확인 필요`);
}

main();
