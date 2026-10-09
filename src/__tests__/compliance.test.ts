import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// 검수 반려 조건 정적 검사 — packet-0020 테스트(HEX·외부 SDK·외부 이동·설치 유도·금지 API·CSS 여백)를 보완한다.
//  1) HEX 템플릿 예외가 기준선(docs/qa/compliance-baseline.md)보다 늘지 않는다.
//  2) 상단 뒤로가기 자체 구현 금지(출시 가이드 반복 위반 ①) — 라우터 히스토리를 직접 되돌리지 않는다.
//  3) 테스트 광고·프로모션 키 배포 금지(반복 위반 ③) — 콘솔 발급 ID 자리에 문자열 리터럴이 없다.
// 이 파일은 패턴 원문을 담으므로 스캔에서 뺀다.
const ROOT = process.cwd();
const SELF = "src/__tests__/compliance.test.ts";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const isTestFile = (file: string) =>
  file.startsWith("src/__tests__/") || /\.test\.(ts|tsx)$/.test(file);

// 테스트를 뺀 앱 소스(레포 상대 슬래시 경로).
function appFiles(ext: RegExp) {
  return walk(path.join(ROOT, "src"))
    .map((abs) => path.relative(ROOT, abs).split(path.sep).join("/"))
    .filter((file) => ext.test(file) && file !== SELF && !isTestFile(file))
    .map((file) => ({ file, text: readFileSync(path.join(ROOT, file), "utf8") }));
}

function scanLines(files: { file: string; text: string }[], pattern: RegExp): string[] {
  return files.flatMap(({ file, text }) =>
    text.split("\n").flatMap((line, i) =>
      pattern.test(line) ? [`${file}:${i + 1} ${line.trim().slice(0, 120)}`] : [],
    ),
  );
}

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const countHex = (file: string) =>
  readFileSync(path.join(ROOT, file), "utf8").split("\n").filter((l) => HEX.test(l)).length;

describe("검수 반려 조건 — 기준선·출시 가이드 반복 위반", () => {
  it("HEX 템플릿 예외 파일이 기준선보다 늘지 않는다", () => {
    // 기준선: reward-ad.css 4줄(var() 폴백), TossRewardAd.tsx·main.tsx 0줄.
    expect(countHex("src/styles/reward-ad.css")).toBeLessThanOrEqual(4);
    expect(countHex("src/components/TossRewardAd.tsx")).toBe(0);
    expect(countHex("src/main.tsx")).toBe(0);
  });

  it("앱 소스가 라우터 히스토리를 직접 되돌리지 않는다(상단 뒤로가기는 토스 내비 바가 제공)", () => {
    const BACK = /\bnavigate\(\s*-\d+\s*\)|\bhistory\.(?:back|go)\s*\(/;
    expect(BACK.test("onClick={() => navigate(-1)}")).toBe(true);
    expect(BACK.test("navigate('/profile/new')")).toBe(false);

    const files = appFiles(/\.(ts|tsx)$/);
    expect(files.length).toBeGreaterThan(10);
    expect(scanLines(files, BACK)).toEqual([]);
  });

  it("광고·결제·프로모션 ID 자리에 문자열 리터럴이 없다(콘솔 발급값은 import.meta.env로)", () => {
    const LITERAL_ID =
      /\b(?:slotId|adGroupId|adUnitId|sku|promotionCode|offerId|\w+_(?:SLOT_ID|AD_GROUP_ID|SKU|PROMOTION_CODE))\s*[:=]\s*["'`][^"'`]+["'`]/;
    expect(LITERAL_ID.test('slotId: "ait-ad-test-1"')).toBe(true);
    expect(LITERAL_ID.test("slotId: import.meta.env.VITE_TOSS_AD_SLOT_ID")).toBe(false);

    expect(scanLines(appFiles(/\.(ts|tsx)$/), LITERAL_ID)).toEqual([]);
  });
});
