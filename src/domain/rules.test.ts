import { describe, it, expect } from "vitest";
import { CHECKUP_RULES, INSURANCE_OPTIONS, formatRuleLine } from "@/domain/rules";

describe("rules", () => {
  it("규칙 7개가 SPEC 표 순서다", () => {
    expect(CHECKUP_RULES.map((r) => r.id)).toEqual([
      "general",
      "stomach",
      "colorectal",
      "breast",
      "cervical",
      "liver",
      "lung",
    ]);
  });

  it("F3-AC-8: 가입유형 설명 3문구", () => {
    const desc = (v: string) => INSURANCE_OPTIONS.find((o) => o.value === v)?.description;
    expect(desc("employee_nonoffice")).toBe("매년 검진 대상이에요");
    expect(desc("dependent")).toBe("만 20세 이상부터 대상이에요");
    expect(desc("medical_aid")).toBe("만 19~64세가 대상이에요");
  });

  it("F8-AC-4: 위암 출처 한 줄", () => {
    expect(formatRuleLine("stomach")).toBe("위암 검진 · 만 40세 이상 · 2년마다 · 암관리법 시행령 별표1");
  });

  it("조건부 항목은 conditionText가 있다", () => {
    expect(CHECKUP_RULES.filter((r) => r.conditional).every((r) => r.conditionText)).toBe(true);
  });
});
