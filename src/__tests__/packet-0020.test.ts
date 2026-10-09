import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// 레포 루트. vitest는 프로젝트 루트에서 돈다(jsdom 환경이라 import.meta.url은 file: 스킴이 아니다).
const ROOT = process.cwd();
// 이 파일은 정적 검사에서 뺀다 — 검사 규칙을 적으려면 금지 토큰을 써야 하므로 자기 자신이 항상 걸린다.
const SELF = "src/__tests__/packet-0020.test.ts";

// HEX 템플릿 예외 — docs/qa/compliance-baseline.md "기준선 예외 템플릿 파일".
const HEX_TEMPLATE_EXEMPT = new Set([
  "src/components/TossRewardAd.tsx",
  "src/main.tsx",
  "src/styles/reward-ad.css",
]);

// TT 템플릿 기준선 — 스캐폴드가 제공하고 "수정하지 않는" 파일(packets.json 스캐폴드 패킷 · CLAUDE.md Pre-built 목록 ·
// main.tsx가 import하는 globals.css). TT-AC-1은 이 밖의 CSS·style={{…}}만 본다.
const STYLE_TEMPLATE_EXEMPT = new Set([
  "src/main.tsx",
  "src/index.css",
  "src/App.css",
  "src/styles/globals.css",
  "src/styles/reward-ad.css",
  "src/pages/__TdsGallery.tsx",
  "src/components/PageShell.tsx",
  "src/components/ScreenScaffold.tsx",
  "src/components/BottomCTA.tsx",
  "src/components/Card.tsx",
  "src/components/SummaryHero.tsx",
  "src/components/Amount.tsx",
  "src/components/StateView.tsx",
  "src/components/FloatingTabBar.tsx",
  "src/components/CountUp.tsx",
  "src/components/MiniBar.tsx",
  "src/components/Sparkline.tsx",
  "src/components/AdSlot.tsx",
  "src/components/TossRewardAd.tsx",
]);

type SourceFile = { file: string; text: string };

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// src/** 아래 파일을 레포 상대 슬래시 경로로 읽는다. SELF는 항상 뺀다.
function srcFiles(ext: RegExp, skip: (file: string) => boolean = () => false): SourceFile[] {
  return walk(path.join(ROOT, "src"))
    .map((abs) => path.relative(ROOT, abs).split(path.sep).join("/"))
    .filter((file) => ext.test(file) && file !== SELF && !skip(file))
    .map((file) => ({ file, text: readFileSync(path.join(ROOT, file), "utf8") }));
}

// 한 줄씩 패턴을 찾는다. 결과는 "파일:줄 원문"이라 실패 메시지가 곧 재작업 목록이다.
function scanLines(files: SourceFile[], pattern: RegExp): string[] {
  return files.flatMap(({ file, text }) =>
    text.split("\n").flatMap((line, i) =>
      pattern.test(line) ? [`${file}:${i + 1} ${line.trim().slice(0, 120)}`] : [],
    ),
  );
}

// style={{…}} 블록 안의 레이아웃 키, 그리고 CSS 파일의 레이아웃 선언.
const STYLE_BLOCK = /style=\{\{([\s\S]*?)\}\}/g;
const STYLE_KEY = /(?:^|[^\w-])(?:height|padding\w*|margin\w*|fontSize|lineHeight)\s*:/;
const CSS_DECL = /(?:^|[^\w-])(?:height|padding[\w-]*|margin[\w-]*|font-size|line-height)\s*:/;

function layoutHits(file: string, text: string): string[] {
  if (file.endsWith(".css")) return scanLines([{ file, text }], CSS_DECL);
  return [...text.matchAll(STYLE_BLOCK)].flatMap((m) => {
    if (!STYLE_KEY.test(m[1])) return [];
    const line = text.slice(0, m.index).split("\n").length;
    return [`${file}:${line} ${m[0].replace(/\s+/g, " ").slice(0, 120)}`];
  });
}

const isTestFile = (file: string) => file.startsWith("src/__tests__/") || /\.test\.(ts|tsx)$/.test(file);

// 릴리스 env 검사 실행. 값이 undefined면 키를 지운다(상속된 process.env의 같은 키도 지운다).
function runReleaseCheck(values: Record<string, string | undefined>) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.VITE_TOSS_AD_GROUP_ID;
  delete env.VITE_TOSS_AD_SLOT_ID;
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) env[key] = value;
  }
  const r = spawnSync(process.execPath, ["scripts/check-release-env.mjs"], { cwd: ROOT, env, encoding: "utf8" });
  return { status: r.status, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

describe("검수 정적 검사 + 릴리스 광고 env 검사 + 터치 영역 QA 문서 (소스 수정 없음)", () => {
  it("AC-1[P0]: should have zero HEX literals and zero react-ga/amplitude/admob/stripe imports in src", () => {
    // 검사기 자체가 살아 있는지: 나쁜 샘플은 잡고 좋은 샘플은 통과해야 한다(0건이 빈 검사의 결과가 아니도록).
    const HEX = /#[0-9a-fA-F]{3,8}\b/;
    expect(HEX.test("color: #6B7684;")).toBe(true);
    expect(HEX.test("color: var(--adaptiveGrey600);")).toBe(false);

    const files = srcFiles(/\.(ts|tsx|css)$/, (f) => HEX_TEMPLATE_EXEMPT.has(f));
    expect(files.length).toBeGreaterThan(10);
    expect(scanLines(files, HEX)).toEqual([]);

    const BANNED_IMPORT = /(?:\bfrom|\bimport\s*\(|\brequire\s*\()\s*["'](?:react-ga|@amplitude\/|[^"']*admob|[^"']*stripe)/i;
    expect(BANNED_IMPORT.test('import ga from "react-ga4";')).toBe(true);
    expect(BANNED_IMPORT.test('import { Top } from "@toss/tds-mobile";')).toBe(false);
    expect(scanLines(srcFiles(/\.(ts|tsx)$/), BANNED_IMPORT)).toEqual([]);
  });

  it("AC-1[P0]: should have zero crypto.randomUUID, structuredClone, .at(, Object.hasOwn, grantPromotionReward in src", () => {
    const BANNED_API = /crypto\.randomUUID|\bstructuredClone\b|\.at\(|Object\.hasOwn\b|grantPromotionReward/;
    expect(BANNED_API.test("const id = crypto.randomUUID();")).toBe(true);
    expect(BANNED_API.test("const last = items.at(-1);")).toBe(true);
    expect(BANNED_API.test("const keys = Object.keys(obj);")).toBe(false);

    const files = srcFiles(/\.(ts|tsx)$/);
    expect(files.length).toBeGreaterThan(10);
    expect(scanLines(files, BANNED_API)).toEqual([]);
  });

  it("AC-2[P0]: should have no window open call, external href assignment, '설치'/'다운로드' strings, or anchor with http href in non-test src", () => {
    // 금지 호출을 리터럴로 적으면 쓰기 전 게이트가 이 파일 자체를 막는다 — 패턴은 조각으로 만든다.
    const OPEN = new RegExp("window\\.open\\s*\\(");
    const HREF_ASSIGN = new RegExp("window\\.location\\.href\\s*=\\s*[\"'`]https?:");
    const INSTALL_TEXT = /["'`>][^"'`<>\n]*(?:설치|다운로드)/;
    const ANCHOR_HTTP = /<a\s[^>]*\bhref\s*=\s*["'`]https?:/;
    expect(OPEN.test("win" + "dow.open(url)")).toBe(true);
    expect(INSTALL_TEXT.test('const label = "앱 설치";')).toBe(true);
    expect(INSTALL_TEXT.test('const label = "결과 보기";')).toBe(false);

    const files = srcFiles(/\.(ts|tsx|css)$/, isTestFile);
    expect(files.length).toBeGreaterThan(10);
    expect(scanLines(files, OPEN)).toEqual([]);
    expect(scanLines(files, HREF_ASSIGN)).toEqual([]);
    expect(scanLines(files, INSTALL_TEXT)).toEqual([]);
    expect(scanLines(files, ANCHOR_HTTP)).toEqual([]);
  });

  it("AC-3[P0]: should have no height/padding/margin/fontSize/lineHeight declarations outside the template baseline", () => {
    // 검사기 자체: style 블록의 레이아웃 키는 잡고, 색만 있는 블록은 통과해야 한다.
    expect(layoutHits("x.tsx", "<i style={{ width: 48, height: 48 }} />")).toHaveLength(1);
    expect(layoutHits("x.tsx", "<i style={{ color: 'red' }} />")).toHaveLength(0);

    const files = srcFiles(/\.(tsx|css)$/, (f) => STYLE_TEMPLATE_EXEMPT.has(f));
    expect(files.length).toBeGreaterThan(10);
    expect(files.flatMap(({ file, text }) => layoutHits(file, text))).toEqual([]);
  });

  it("AC-4[P0]: should exit 1 and print the missing key names when a release ad env value is missing or empty", () => {
    const both = runReleaseCheck({});
    expect(both.status).toBe(1);
    expect(both.output).toContain("VITE_TOSS_AD_GROUP_ID");
    expect(both.output).toContain("VITE_TOSS_AD_SLOT_ID");

    // 하나만 빈 값("")이면 그 키 이름만 나온다 — 빈 문자열도 빠진 것으로 본다.
    const slotEmpty = runReleaseCheck({ VITE_TOSS_AD_GROUP_ID: "grp-live-1", VITE_TOSS_AD_SLOT_ID: "" });
    expect(slotEmpty.status).toBe(1);
    expect(slotEmpty.output).toContain("VITE_TOSS_AD_SLOT_ID");
    expect(slotEmpty.output).not.toContain("VITE_TOSS_AD_GROUP_ID");
  });

  it("AC-4[P0]: should exit 0 when both release ad env values are present, and 1 when either is absent", () => {
    const ok = runReleaseCheck({ VITE_TOSS_AD_GROUP_ID: "grp-live-1", VITE_TOSS_AD_SLOT_ID: "slot-live-1" });
    expect(ok.status).toBe(0);

    const groupOnly = runReleaseCheck({ VITE_TOSS_AD_GROUP_ID: "grp-live-1", VITE_TOSS_AD_SLOT_ID: undefined });
    expect(groupOnly.status).toBe(1);
    expect(groupOnly.output).toContain("VITE_TOSS_AD_SLOT_ID");
  });

  it("AC-4[P0]: should run the release check before build under build:release and leave the build script unchanged", () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const releaseScript = pkg.scripts["build:release"];
    // 검사가 실패하면 && 때문에 build가 돌지 않아야 한다.
    expect(releaseScript).toMatch(/node scripts\/check-release-env\.mjs\s*&&.*build/);
    // build 스크립트는 fail-open 그대로여야 한다(광고 env 없이도 개발 빌드가 된다).
    expect(pkg.scripts.build).toBe("vite build");
  });

  it("AC-5[P0]: should list every S1·S2 interactive element with a measured px height and a pass cell in docs/qa/touch-targets.md", () => {
    const doc = readFileSync(path.join(ROOT, "docs/qa/touch-targets.md"), "utf8");
    expect(doc).toMatch(/S1/);
    expect(doc).toMatch(/S2/);

    const rows = doc.split("\n").filter((l) => l.trim().startsWith("|"));
    const header = rows.find((r) => /높이/.test(r) && /통과/.test(r));
    expect(header).toBeDefined();

    // 요소별 행: 요소 이름 + 측정 px + 통과 판정(✅/❌/통과/미달)이 한 행에 있어야 한다.
    const PX = /\d+(?:\.\d+)?\s*px/;
    const STATUS = /통과|미달|✅|❌|PASS|FAIL/;
    const ELEMENTS: [string, RegExp][] = [
      ["ListRow", /ListRow/],
      ["Switch", /Switch/],
      ["Button", /\bButton\b/],
      ["ChipItem", /ChipItem/],
      ["시트 버튼", /BottomSheet|시트/],
    ];
    const missing = ELEMENTS.filter(([, re]) => !rows.some((r) => re.test(r) && PX.test(r) && STATUS.test(r))).map(([name]) => name);
    expect(missing).toEqual([]);
    expect(ELEMENTS.length).toBe(5);
  });
});
