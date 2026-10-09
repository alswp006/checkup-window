import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

// scripts/check-release-env.mjs — 릴리스 빌드 전 광고 env 검사.
// packet-0020 테스트가 process.env 경로를 덮는다. 여기서는 공백 값과 .env 파일 경로(Vite loadEnv와 같은 규칙)를 고정한다.
const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts/check-release-env.mjs");
const KEYS = ["VITE_TOSS_AD_GROUP_ID", "VITE_TOSS_AD_SLOT_ID"] as const;

const tempDirs: string[] = [];

function run(values: Record<string, string>, cwd = ROOT) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of KEYS) delete env[key];
  Object.assign(env, values);
  const r = spawnSync(process.execPath, [SCRIPT], { cwd, env, encoding: "utf8" });
  return { status: r.status, output: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

// .env 파일만 든 빈 작업 디렉토리 — 레포의 .env를 건드리지 않는다.
function dirWithEnvFile(name: string, content: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "release-env-"));
  tempDirs.push(dir);
  writeFileSync(path.join(dir, name), content);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("check-release-env", () => {
  it("공백만 있는 값은 빠진 것으로 보고 그 키 이름만 출력한다", () => {
    const r = run({ VITE_TOSS_AD_GROUP_ID: "   ", VITE_TOSS_AD_SLOT_ID: "slot-live-1" });
    expect(r.status).toBe(1);
    expect(r.output).toContain("VITE_TOSS_AD_GROUP_ID");
    expect(r.output).not.toContain("VITE_TOSS_AD_SLOT_ID");
  });

  it(".env.production에 둘 다 채워져 있으면 통과한다(Vite production 빌드가 읽는 파일)", () => {
    const cwd = dirWithEnvFile(".env.production", "VITE_TOSS_AD_GROUP_ID=grp-live-1\nVITE_TOSS_AD_SLOT_ID=slot-live-1\n");
    expect(run({}, cwd).status).toBe(0);
  });

  it(".env 값이 있어도 환경변수의 빈 값이 이긴다(Vite와 같은 우선순위)", () => {
    const cwd = dirWithEnvFile(".env", "VITE_TOSS_AD_GROUP_ID=grp-live-1\nVITE_TOSS_AD_SLOT_ID=slot-live-1\n");
    const r = run({ VITE_TOSS_AD_SLOT_ID: "" }, cwd);
    expect(r.status).toBe(1);
    expect(r.output).toContain("VITE_TOSS_AD_SLOT_ID");
  });
});
