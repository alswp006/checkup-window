/**
 * 스캐폴드 CSS 정리 + 검수 기준선 + .env.example 테스트.
 *
 * 이 패킷은 렌더되는 컴포넌트가 없어서 TDS·라우터·AppState 목을 걸지 않는다.
 * 검증 대상은 파일 내용이다: CSS 선언(HEX·박스/폰트 속성), 기준선 문서 구조,
 * .env.example 키 2개, 그리고 빌드가 통과하고 main.tsx가 HEAD와 같은가.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

const CSS_FILES = ["src/index.css", "src/App.css"];
const DOC = "docs/qa/compliance-baseline.md";

// AC-1은 grep과 같은 정규식을 그대로 쓴다(주석 포함 — grep은 주석을 가리지 않는다).
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

// AC-2: 선언 이름만 본다. 주석 안의 설명 문장("padding 제거")은 걸리면 안 된다.
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const FORBIDDEN_DECL = /\b(?:height|padding|margin|font|line-height)(?:-[a-z]+)*\s*:/g;

describe("스캐폴드 CSS 정리 + 검수 기준선 + .env.example", () => {
  it("AC-1: should have zero HEX color literals in src/index.css and src/App.css", () => {
    const hexHits = CSS_FILES.map((f) => ({ file: f, hits: read(f).match(HEX) ?? [] }));

    // 빈 파일이 0건으로 통과하지 않도록 내용이 실재하는지도 확인한다.
    expect(CSS_FILES.map((f) => read(f).trim().length > 0)).toEqual([true, true]);
    expect(hexHits.map((h) => h.hits)).toEqual([[], []]);
  });

  it("AC-2: should keep no height/padding/margin/font/line-height declarations and keep flex or grid layout", () => {
    const declared = CSS_FILES.map((f) => ({
      file: f,
      decls: stripComments(read(f)).match(FORBIDDEN_DECL) ?? [],
    }));
    const layoutText = CSS_FILES.map((f) => stripComments(read(f))).join("\n");

    expect(declared.map((d) => d.decls)).toEqual([[], []]);
    expect(layoutText).toMatch(/display\s*:\s*(?:flex|grid)/);
  });

  it("AC-3: should record the src HEX scan command and its result in compliance-baseline.md", () => {
    const doc = read(DOC);
    const cmdLine = doc.split("\n").find((l) => /grep/.test(l) && /src/.test(l) && /0-9a-fA-F/.test(l));

    // 명령에는 HEX 패턴과 src 경로가 같이 있어야 재현된다.
    expect(cmdLine ?? "").toMatch(/\bsrc\b/);
    expect(cmdLine ?? "").toMatch(/\{3,8\}/);
    // 결과는 '0건'이거나 파일:줄 목록이어야 한다.
    expect(doc).toMatch(/0건|src\/[\w./-]+\.(?:tsx?|css):\d+/);
  });

  it("AC-3: should list the template files kept as baseline exceptions, and every listed path must exist", () => {
    const lines = read(DOC).split("\n");
    const headingIdx = lines.findIndex((l) => /^#+.*예외/.test(l));

    expect(headingIdx).toBeGreaterThanOrEqual(0);

    const section = lines.slice(headingIdx).join("\n");
    const listed = section.match(/src\/[\w./-]+\.tsx?/g) ?? [];

    expect(listed.length).toBeGreaterThan(0);
    expect(listed.filter((p) => !existsSync(resolve(ROOT, p)))).toEqual([]);
  });

  it("AC-4: should declare VITE_TOSS_AD_GROUP_ID= and VITE_TOSS_AD_SLOT_ID= lines with empty values", () => {
    const env = read(".env.example");

    expect(env.match(/^VITE_TOSS_AD_GROUP_ID=.*$/m)?.[0]).toBe("VITE_TOSS_AD_GROUP_ID=");
    expect(env.match(/^VITE_TOSS_AD_SLOT_ID=.*$/m)?.[0]).toBe("VITE_TOSS_AD_SLOT_ID=");
    expect(env).toMatch(/^VITE_TOSS_AD_GROUP_ID=\s*$/m);
    expect(env).toMatch(/^VITE_TOSS_AD_SLOT_ID=\s*$/m);
  });

  it("AC-5: should leave src/main.tsx byte-identical to HEAD (diff 0 lines)", () => {
    const numstat = execSync("git diff --numstat HEAD -- src/main.tsx", { cwd: ROOT, encoding: "utf8" });

    expect(numstat.trim()).toBe("");
    expect(read("src/main.tsx").length).toBeGreaterThan(0);
  });

  it("AC-5: should pass npm run build and emit dist/index.html", () => {
    const out = execSync("npm run build", { cwd: ROOT, encoding: "utf8", stdio: "pipe", timeout: 300_000 });

    expect(out).toMatch(/built in/);
    expect(existsSync(resolve(ROOT, "dist/index.html"))).toBe(true);
  }, 300_000);
});
