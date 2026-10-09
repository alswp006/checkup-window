import type { CheckupRecord, CheckupRule, ItemStatus, Profile, ProfileResult } from "@/lib/types";
import { CHECKUP_RULES, formatAgeRange, resolveRule } from "@/domain/rules";

const MIN_BIRTH_YEAR = 1920;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 평가 가능한 출생연도인가 (1920 ~ 올해). 던지지 않는다. */
export function isEvaluable(birthYear: number, today: Date): boolean {
  return Number.isInteger(birthYear) && birthYear >= MIN_BIRTH_YEAR && birthYear <= today.getFullYear();
}

/** 오늘(날짜 기준)부터 12월 31일까지 남은 일수. 시각은 무시한다. */
export function daysUntilYearEnd(today: Date): number {
  const y = today.getFullYear();
  const end = Date.UTC(y, 11, 31);
  const now = Date.UTC(y, today.getMonth(), today.getDate());
  return Math.round((end - now) / DAY_MS);
}

/** fromYear 이후(포함) 처음 대상이 되는 연도. 연령 상한을 넘기면 null. */
function nextEligibleYear(rule: CheckupRule, birthYear: number, fromYear: number): number | null {
  let year = fromYear;
  if (rule.minAge !== null) year = Math.max(year, birthYear + rule.minAge);
  if (rule.cycle === "biennial" && year % 2 !== birthYear % 2) year += 1;
  if (rule.maxAge !== null && year - birthYear > rule.maxAge) return null;
  return year;
}

function buildReason(
  rule: CheckupRule,
  birthYear: number,
  year: number,
  nextYear: number | null,
  received: boolean,
  eligible: boolean,
): string {
  if (received) {
    return nextYear === null ? "올해 받았어요" : `올해 받았어요 · 다음은 ${nextYear}년`;
  }
  if (eligible) return rule.conditional ? "해당하면 올해 대상이에요" : "올해 대상이에요";
  if (nextYear === null) {
    return `대상 연령(${formatAgeRange(rule.minAge, rule.maxAge)})이 아니에요`;
  }
  const ageThen = year - birthYear;
  if (rule.minAge !== null && ageThen < rule.minAge) {
    return `만 ${rule.minAge}세가 되는 ${nextYear}년부터 대상이에요`;
  }
  return `${nextYear}년 대상(${birthYear % 2 === 1 ? "홀수년" : "짝수년"} 출생)`;
}

function evaluateItem(rule: CheckupRule, profile: Profile, records: CheckupRecord[], year: number): ItemStatus {
  const effective = resolveRule(rule, profile.insuranceType);
  const age = year - profile.birthYear;
  const received = records.some((r) => r.profileId === profile.id && r.itemId === rule.id && r.year === year);
  const eligible =
    (effective.minAge === null || age >= effective.minAge) &&
    (effective.maxAge === null || age <= effective.maxAge) &&
    (effective.cycle === "annual" || profile.birthYear % 2 === year % 2);
  const nextYear = nextEligibleYear(effective, profile.birthYear, received ? year + 1 : year);

  return {
    itemId: rule.id,
    label: rule.label,
    eligibleThisYear: eligible,
    conditional: rule.conditional,
    received,
    nextYear,
    reason: buildReason(effective, profile.birthYear, year, nextYear, received, eligible),
  };
}

/** 프로필 한 명의 올해 검진 판정. 출생연도가 범위를 벗어나면 RangeError('INVALID_BIRTH_YEAR'). */
export function evaluateProfile(profile: Profile, records: CheckupRecord[], today: Date): ProfileResult {
  if (!isEvaluable(profile.birthYear, today)) throw new RangeError("INVALID_BIRTH_YEAR");

  const year = today.getFullYear();
  const items = CHECKUP_RULES.filter((rule) => rule.sex === null || rule.sex === profile.sex).map((rule) =>
    evaluateItem(rule, profile, records, year),
  );

  const core = items.filter((i) => !i.conditional);
  const nextYears = core.map((i) => i.nextYear).filter((y): y is number => y !== null);

  return {
    profileId: profile.id,
    year,
    age: year - profile.birthYear,
    items,
    eligibleCount: core.filter((i) => i.eligibleThisYear).length,
    receivedCount: core.filter((i) => i.eligibleThisYear && i.received).length,
    daysLeft: daysUntilYearEnd(today),
    nextCheckupYear: nextYears.length > 0 ? Math.min(...nextYears) : null,
  };
}
