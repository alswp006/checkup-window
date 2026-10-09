import type { CheckupRecord, PlanYear, Profile, ProfileResult } from "@/lib/types";
import { evaluateProfile, isEvaluable } from "@/domain/checkup";

/** 프로필 한 명의 향후 `years`년 계획. 출생연도가 범위를 벗어나면 빈 배열. 던지지 않는다. */
export function buildPlan(profile: Profile, records: CheckupRecord[], today: Date, years = 3): PlanYear[] {
  if (!isEvaluable(profile.birthYear, today)) return [];

  const startYear = today.getFullYear();
  const plan: PlanYear[] = [];
  for (let i = 0; i < years; i += 1) {
    const year = startYear + i;
    const date = i === 0 ? today : new Date(year, 0, 1);
    plan.push({ year, items: evaluateProfile(profile, records, date).items });
  }
  return plan;
}

/** 판정 가능한 프로필만 판정하고, 불가능한 프로필의 id는 invalidIds로 돌려준다. 던지지 않는다. */
export function evaluateAll(
  profiles: Profile[],
  records: CheckupRecord[],
  today: Date,
): { results: ProfileResult[]; invalidIds: string[] } {
  const results: ProfileResult[] = [];
  const invalidIds: string[] = [];
  for (const profile of profiles) {
    if (isEvaluable(profile.birthYear, today)) {
      results.push(evaluateProfile(profile, records, today));
    } else {
      invalidIds.push(profile.id);
    }
  }
  return { results, invalidIds };
}

/** 계획표 줄: 프로필 순서대로 한 줄. plan은 프로필 id → 그 해의 PlanYear. */
export function planLines(plan: Record<string, PlanYear>, profiles: Profile[]): string[] {
  const lines: string[] = [];
  for (const profile of profiles) {
    const year = plan[profile.id];
    if (!year) continue;
    const core = year.items.filter((i) => i.eligibleThisYear && !i.conditional).map((i) => i.label);
    if (core.length > 0) {
      lines.push(`${profile.name} — ${core.join("·")}`);
      continue;
    }
    const conditional = year.items
      .filter((i) => i.eligibleThisYear && i.conditional)
      .map((i) => i.label.replace(/ 검진$/, ""));
    lines.push(
      conditional.length > 0
        ? `${profile.name} — 조건부 ${conditional.join("·")}만`
        : `${profile.name} — 대상 없음`,
    );
  }
  return lines;
}

/** 가족 행 요약 문구(이름 제외). */
export function familySummary(result: ProfileResult): string {
  const targets = result.items.filter((i) => i.eligibleThisYear && !i.conditional);
  if (result.eligibleCount === 0) {
    return result.nextCheckupYear === null
      ? "올해 대상 없음"
      : `올해 대상 없음 · 다음 ${result.nextCheckupYear}년`;
  }
  if (targets.length === 1) {
    return `올해 대상 1개(${targets[0].label.replace(/ 검진$/, "")})`;
  }
  return `올해 대상 ${result.eligibleCount}개`;
}

/** 출생연도가 범위를 벗어나 판정할 수 없는 가족 행 문구. */
export function invalidFamilyLine(name: string): string {
  return `${name} · 출생연도를 확인해주세요`;
}
