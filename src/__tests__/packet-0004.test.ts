/**
 * 판정 엔진 — buildPlan·evaluateAll·계획표/가족 문구 테스트.
 *
 * 순수 함수 패킷이라 TDS·라우터·AppState 목은 걸지 않는다(UI가 없다).
 * today는 인자로 넘기지만, 날짜 의존 코드가 시계를 읽지 않도록 Date만 고정한다.
 *
 * 계약 메모(구현 전 고정):
 * - planLines(plan, profiles): plan은 `Record<profileId, PlanYear>`(한 해의 계획), 줄은 profiles 순서대로 한 줄씩.
 * - familySummary(result): 이름 없이 요약 문구만 ("올해 대상 5개"). 이름이 붙은 행은 formatFamilyRow의 몫.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildPlan, evaluateAll, planLines, familySummary, invalidFamilyLine } from "@/domain/plan";
import { evaluateProfile } from "@/domain/checkup";
import type { PlanYear, Profile, ProfileResult } from "@/lib/types";

const TODAY = new Date(2026, 9, 10); // 2026-10-10

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
});

const profile = (
  id: string,
  name: string,
  birthYear: number,
  sex: Profile["sex"],
  insuranceType: Profile["insuranceType"],
  role: Profile["role"] = "family",
): Profile => ({
  id,
  name,
  role,
  birthYear,
  sex,
  insuranceType,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
});

const me = profile("self", "나", 1986, "male", "employee_office", "self");
const mom = profile("mom", "엄마", 1966, "female", "dependent");
const dad = profile("dad", "아빠", 1963, "male", "regional_head");
const sister = profile("sister", "동생", 1997, "female", "dependent");

/** 비조건부이면서 올해 대상인 항목 id */
const coreEligibleIds = (year: PlanYear) =>
  year.items.filter((i) => i.eligibleThisYear && !i.conditional).map((i) => i.itemId);

describe("판정 엔진 — buildPlan·evaluateAll·계획표/가족 문구", () => {
  it("F1-AC-8[P1]: should return 2026·2027·2028 for 1986 male office, with 0 core targets in 2027 and general·stomach in 2028", () => {
    const plan = buildPlan(me, [], TODAY);

    expect(plan.map((y) => y.year)).toEqual([2026, 2027, 2028]);
    expect(coreEligibleIds(plan[1])).toEqual([]);
    expect(coreEligibleIds(plan[2])).toEqual(["general", "stomach"]);
  });

  it("F1-AC-8[P1]: should return an empty result without throwing when there are no profiles", () => {
    expect(() => evaluateAll([], [], TODAY)).not.toThrow();
    expect(evaluateAll([], [], TODAY)).toEqual({ results: [], invalidIds: [] });
  });

  it("F7-AC-2: should list 아빠 core targets and 나 conditional-only in the 2027 plan lines", () => {
    const plan2027 = Object.fromEntries(
      [me, mom, dad].map((p) => [p.id, buildPlan(p, [], TODAY).find((y) => y.year === 2027)!]),
    );

    const lines = planLines(plan2027, [me, mom, dad]);

    expect(lines).toContain("아빠 — 일반건강검진·위암 검진·대장암 검진");
    expect(lines).toContain("나 — 조건부 간암만");
    expect(lines).toEqual(["나 — 조건부 간암만", "엄마 — 대장암 검진", "아빠 — 일반건강검진·위암 검진·대장암 검진"]);
  });

  it("F7-AC-2: should summarize 엄마 as 5 targets and 아빠 as 1 target (대장암) for this year", () => {
    const momResult: ProfileResult = evaluateProfile(mom, [], TODAY);
    const dadResult: ProfileResult = evaluateProfile(dad, [], TODAY);

    expect(familySummary(momResult)).toBe("올해 대상 5개");
    expect(familySummary(dadResult)).toBe("올해 대상 1개(대장암)");
  });

  it("F7-AC-7: should summarize 동생 with no target this year and next checkup in 2027", () => {
    const sisterResult = evaluateProfile(sister, [], TODAY);

    expect(sisterResult.eligibleCount).toBe(0);
    expect(familySummary(sisterResult)).toBe("올해 대상 없음 · 다음 2027년");
  });

  it("DV-AC-2: should drop a 1900 birth-year profile from results without throwing and report its id in invalidIds", () => {
    const bad = profile("bad", "이상한 프로필", 1900, "male", "employee_office");

    expect(() => evaluateAll([me, bad], [], TODAY)).not.toThrow();
    const { results, invalidIds } = evaluateAll([me, bad], [], TODAY);

    expect(results.map((r) => r.profileId)).toEqual(["self"]);
    expect(invalidIds).toEqual(["bad"]);
    expect(buildPlan(bad, [], TODAY)).toEqual([]);
  });

  it("DV-AC-2: should build the invalid-birth-year family line as '엄마 · 출생연도를 확인해주세요'", () => {
    expect(invalidFamilyLine("엄마")).toBe("엄마 · 출생연도를 확인해주세요");
    expect(invalidFamilyLine("아빠")).toContain("출생연도를 확인해주세요");
  });
});
