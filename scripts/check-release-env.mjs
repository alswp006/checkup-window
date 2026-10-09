#!/usr/bin/env node
// check-release-env.mjs — 릴리스 빌드 전에 광고 env(콘솔 발급값)가 채워졌는지 확인한다.
//
// Usage: node scripts/check-release-env.mjs
//   package.json "build:release"가 build 앞에서 돈다. "build"는 이 검사를 거치지 않는다(fail-open —
//   광고 env 없이도 개발 빌드는 되고, 광고 영역만 렌더되지 않는다).
//
// 값은 Vite가 production 빌드에서 읽는 것과 같은 규칙으로 읽는다(loadEnv): process.env가 먼저,
// 없으면 .env / .env.local / .env.production / .env.production.local. 빈 문자열·공백만 있는 값도 빠진 것이다.
//
// Exit 0 = 둘 다 있음. Exit 1 = 하나라도 빠짐(빠진 키 이름을 출력).

import { loadEnv } from "vite";

const REQUIRED = ["VITE_TOSS_AD_GROUP_ID", "VITE_TOSS_AD_SLOT_ID"];

const env = loadEnv("production", process.cwd(), "VITE_");
const missing = REQUIRED.filter((key) => (env[key] ?? "").trim() === "");

if (missing.length > 0) {
  console.error(`✗ 릴리스 빌드 중단 — 광고 env가 비어 있다: ${missing.join(", ")}`);
  console.error("  앱인토스 콘솔 발급값을 .env(또는 환경변수)에 채운 뒤 다시 실행하라. 키 목록은 .env.example.");
  process.exit(1);
}

console.log(`✓ 릴리스 광고 env 확인: ${REQUIRED.join(", ")}`);
