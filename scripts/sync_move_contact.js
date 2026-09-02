/**
 * sync_move_contact.js — 기술의 접촉/비접촉(contact) 플래그를 권위 있는 소스와 맞춘다.
 *
 * data/quiz_moves.json 의 `contact` 는 계산기의 접촉 관련 특성(파동의방호·푹신푹신·
 * 단단한발톱)이 그대로 읽는 값이라, 틀리면 데미지가 조용히 어긋난다.
 * 2026-09-02 전수 대조에서 929개 중 72개가 틀린 것이 확인돼 이 스크립트를 만들었다.
 *
 * 기준 소스: Pokémon Showdown 배틀 데이터의 move flags (`flags.contact`).
 * 표본 7개를 Bulbapedia 기술 페이지의 "Makes contact" 표기와 대조해 전부 일치함을 확인했다.
 *
 * 사용법
 *   node scripts/sync_move_contact.js --check   차이만 보고, 파일은 건드리지 않음 (차이 있으면 exit 1)
 *   node scripts/sync_move_contact.js           quiz_moves.json 을 실제로 교정
 *
 * 교정 후에는 포챔스 쪽 반영이 필요하다 →  cd ../pochams_project && npm run sync
 */
const fs = require("fs");
const path = require("path");

const SOURCE_URL = "https://play.pokemonshowdown.com/data/moves.json";
const MOVES_PATH = path.join(__dirname, "..", "data", "quiz_moves.json");

/** 표기 차이(공백·하이픈·대소문자)를 흡수해 두 데이터를 맞추기 위한 키 */
const normalize = (name) => (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function fetchContactFlags() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`기준 데이터를 못 받았다 (HTTP ${res.status})`);
  const raw = await res.json();
  const flags = new Map();
  for (const [key, move] of Object.entries(raw)) {
    flags.set(key, Boolean(move.flags && move.flags.contact));
  }
  return flags;
}

function collectDiff(moves, flags) {
  const mismatched = [];
  const unmatched = [];
  for (const move of moves) {
    const truth = flags.get(normalize(move.en));
    if (truth === undefined) {
      unmatched.push(move);
      continue;
    }
    if (truth !== move.contact) mismatched.push({ move, truth });
  }
  return { mismatched, unmatched };
}

function report({ mismatched, unmatched }, total) {
  console.log(`대조 ${total}개 — 불일치 ${mismatched.length}개, 기준에 없는 기술 ${unmatched.length}개`);
  if (unmatched.length) {
    console.log("\n기준 데이터에 없어 확인하지 못한 기술 (챔피언스 신규 기술이면 수동 확인 필요):");
    for (const m of unmatched) console.log(`  ${m.ko} (${m.en})`);
  }
  if (!mismatched.length) return;
  console.log("\n불일치 (현재값 → 실제값):");
  for (const { move, truth } of mismatched) {
    const scope = move.in_champions ? "챔피언스" : "        ";
    console.log(`  ${scope} ${move.ko} [${move.en}] ${move.contact} → ${truth}`);
  }
  const champions = mismatched.filter(({ move }) => move.in_champions).length;
  console.log(`\n그중 챔피언스 기술 ${champions}개`);
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const moves = JSON.parse(fs.readFileSync(MOVES_PATH, "utf8"));
  const flags = await fetchContactFlags();
  const diff = collectDiff(moves, flags);
  report(diff, moves.length);

  if (checkOnly) {
    if (diff.mismatched.length) {
      console.log("\n--check 모드라 파일은 그대로 뒀다. 교정하려면 --check 없이 다시 실행한다.");
      process.exit(1);
    }
    console.log("\ncontact 플래그가 기준과 일치한다.");
    return;
  }

  if (!diff.mismatched.length) {
    console.log("\n고칠 것이 없다.");
    return;
  }
  for (const { move, truth } of diff.mismatched) move.contact = truth;
  fs.writeFileSync(MOVES_PATH, JSON.stringify(moves, null, 2));
  console.log(`\n${diff.mismatched.length}개를 교정했다. 포챔스에도 반영하려면: cd ../pochams_project && npm run sync`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
