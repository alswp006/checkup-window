import type { CheckupItemId, CheckupRule, InsuranceType } from "@/lib/types";

const CANCER_SOURCE = "암관리법 시행령 별표1";

/** 검진 기준 상수 — SPEC 표 순서 그대로. 기준값은 이 파일 밖에 두지 않는다. */
export const CHECKUP_RULES: readonly CheckupRule[] = [
  {
    id: "general",
    label: "일반건강검진",
    cycle: "biennial",
    minAge: null,
    maxAge: null,
    sex: null,
    conditional: false,
    conditionText: null,
    source: "국민건강보험법 제52조·시행령 제25조, 건강검진 실시기준",
  },
  {
    id: "stomach",
    label: "위암 검진",
    cycle: "biennial",
    minAge: 40,
    maxAge: null,
    sex: null,
    conditional: false,
    conditionText: null,
    source: CANCER_SOURCE,
  },
  {
    id: "colorectal",
    label: "대장암 검진",
    cycle: "annual",
    minAge: 50,
    maxAge: null,
    sex: null,
    conditional: false,
    conditionText: null,
    source: CANCER_SOURCE,
  },
  {
    id: "breast",
    label: "유방암 검진",
    cycle: "biennial",
    minAge: 40,
    maxAge: null,
    sex: "female",
    conditional: false,
    conditionText: null,
    source: CANCER_SOURCE,
  },
  {
    id: "cervical",
    label: "자궁경부암 검진",
    cycle: "biennial",
    minAge: 20,
    maxAge: null,
    sex: "female",
    conditional: false,
    conditionText: null,
    source: CANCER_SOURCE,
  },
  {
    id: "liver",
    label: "간암 검진",
    cycle: "annual",
    minAge: 40,
    maxAge: null,
    sex: null,
    conditional: true,
    conditionText: "간경변증, B형간염 항원 양성, C형간염 항체 양성, B형·C형 간염 바이러스에 의한 만성 간질환자",
    source: CANCER_SOURCE,
  },
  {
    id: "lung",
    label: "폐암 검진",
    cycle: "biennial",
    minAge: 54,
    maxAge: 74,
    sex: null,
    conditional: true,
    conditionText: "30갑년 이상 흡연력을 가진 흡연자",
    source: CANCER_SOURCE,
  },
];

export interface GeneralCheckupRule {
  cycle: CheckupRule["cycle"];
  minAge: number | null;
  maxAge: number | null;
}

/** 일반건강검진의 가입유형별 규칙 */
export const GENERAL_RULE_BY_INSURANCE: Record<InsuranceType, GeneralCheckupRule> = {
  employee_office: { cycle: "biennial", minAge: null, maxAge: null },
  employee_nonoffice: { cycle: "annual", minAge: null, maxAge: null },
  regional_head: { cycle: "biennial", minAge: null, maxAge: null },
  dependent: { cycle: "biennial", minAge: 20, maxAge: null },
  medical_aid: { cycle: "biennial", minAge: 19, maxAge: 64 },
};

export interface InsuranceOption {
  value: InsuranceType;
  label: string;
  description: string;
}

/** 가입유형 라벨·설명 (프로필 폼 선택지 순서) */
export const INSURANCE_OPTIONS: readonly InsuranceOption[] = [
  { value: "employee_office", label: "직장가입자(사무직)", description: "2년에 한 번 검진 대상이에요" },
  { value: "employee_nonoffice", label: "직장가입자(비사무직)", description: "매년 검진 대상이에요" },
  { value: "regional_head", label: "지역가입자 세대주", description: "2년에 한 번 검진 대상이에요" },
  { value: "dependent", label: "피부양자·세대원", description: "만 20세 이상부터 대상이에요" },
  { value: "medical_aid", label: "의료급여수급권자", description: "만 19~64세가 대상이에요" },
];

export function getRule(id: CheckupItemId): CheckupRule {
  const rule = CHECKUP_RULES.find((r) => r.id === id);
  if (!rule) throw new RangeError("UNKNOWN_RULE");
  return rule;
}

/** 항목 규칙에 가입유형별 일반검진 규칙을 덮어 쓴 실효 규칙 */
export function resolveRule(rule: CheckupRule, insuranceType: InsuranceType): CheckupRule {
  if (rule.id !== "general") return rule;
  return { ...rule, ...GENERAL_RULE_BY_INSURANCE[insuranceType] };
}

/** 연령 범위 문구. 예: "19~64세", "40세 이상", "74세 이하". 제한이 없으면 null */
export function formatAgeRange(minAge: number | null, maxAge: number | null): string | null {
  if (minAge !== null && maxAge !== null) return `${minAge}~${maxAge}세`;
  if (minAge !== null) return `${minAge}세 이상`;
  if (maxAge !== null) return `${maxAge}세 이하`;
  return null;
}

/** 출처 시트 한 줄. 예: "위암 검진 · 만 40세 이상 · 2년마다 · 암관리법 시행령 별표1" */
export function formatRuleLine(id: CheckupItemId): string {
  const rule = getRule(id);
  const age = formatAgeRange(rule.minAge, rule.maxAge);
  const parts: string[] = [rule.label];
  if (age) parts.push(`만 ${age}`);
  if (rule.sex === "female") parts.push("여성");
  parts.push(rule.cycle === "annual" ? "매년" : "2년마다");
  parts.push(rule.source);
  return parts.join(" · ");
}
