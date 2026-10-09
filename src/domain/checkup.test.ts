import { describe, it, expect } from "vitest";
import { evaluateProfile, isEvaluable, daysUntilYearEnd } from "@/domain/checkup";
import type { Profile } from "@/lib/types";

const TODAY = new Date(2026, 9, 10);
const p = (birthYear: number, sex: Profile["sex"], insuranceType: Profile["insuranceType"]): Profile => ({
  id: "p1",
  name: "나",
  role: "self",
  birthYear,
  sex,
  insuranceType,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
});

describe("checkup", () => {
  it("1986 남성 사무직: 올해 대상 2개, 나이 40", () => {
    const r = evaluateProfile(p(1986, "male", "employee_office"), [], TODAY);
    expect(r.eligibleCount).toBe(2);
    expect(r.age).toBe(40);
    expect(r.daysLeft).toBe(82);
  });

  it("남은 일수는 날짜 기준이다", () => {
    expect(daysUntilYearEnd(new Date(2026, 11, 31, 23, 59))).toBe(0);
    expect(daysUntilYearEnd(new Date(2026, 11, 1))).toBe(30);
  });

  it("잘못된 출생연도는 RangeError, isEvaluable은 false", () => {
    expect(() => evaluateProfile(p(1919, "male", "employee_office"), [], TODAY)).toThrow(
      new RangeError("INVALID_BIRTH_YEAR"),
    );
    expect(isEvaluable(2027, TODAY)).toBe(false);
    expect(isEvaluable(2026, TODAY)).toBe(true);
  });

  it("수검 기록은 다른 프로필 것을 무시한다", () => {
    const r = evaluateProfile(
      p(1986, "male", "employee_office"),
      [{ profileId: "other", itemId: "general", year: 2026, receivedAt: "2026-03-01T00:00:00.000Z" }],
      TODAY,
    );
    expect(r.receivedCount).toBe(0);
  });
});
