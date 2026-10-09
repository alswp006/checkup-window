/**
 * 검진 기준 상수(rules) + 판정 엔진 evaluateProfile·daysUntilYearEnd 테스트.
 *
 * 순수 함수 패킷이라 TDS·라우터·AppState 목은 걸지 않는다.
 * today는 인자로 받으므로 시계를 고정할 필요가 없다(Date 객체를 직접 넘긴다).
 */
import { describe, it, expect } from "vitest";
import { CHECKUP_RULES, INSURANCE_OPTIONS, formatRuleLine } from "@/domain/rules";
import { evaluateProfile, isEvaluable, daysUntilYearEnd } from "@/domain/checkup";
import type { CheckupRecord, InsuranceType, Profile, ProfileResult, Sex } from "@/lib/types";

const TODAY = new Date(2026, 9, 10); // 2026-10-10

const profile = (birthYear: number, sex: Sex, insuranceType: InsuranceType): Profile => ({
  id: "p1",
  name: "본인",
  role: "self",
  birthYear,
  sex,
  insuranceType,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
});

const record = (itemId: CheckupRecord["itemId"], year: number): CheckupRecord => ({
  profileId: "p1",
  itemId,
  year,
  receivedAt: "2026-03-01T00:00:00.000Z",
});

const itemOf = (result: ProfileResult, itemId: CheckupRecord["itemId"]) => {
  const item = result.items.find((i) => i.itemId === itemId);
  if (!item) throw new Error(`item ${itemId} missing`);
  return item;
};

describe("검진 기준 상수(rules) + 판정 엔진 evaluateProfile·daysUntilYearEnd", () => {
  it("F1-AC-1[P0]: should judge 1986 male office on 2026-10-10 as general/stomach eligible, liver conditional, colorectal next 2036", () => {
    const result = evaluateProfile(profile(1986, "male", "employee_office"), [], TODAY);

    expect(itemOf(result, "general")).toMatchObject({ eligibleThisYear: true, nextYear: 2026 });
    expect(itemOf(result, "stomach")).toMatchObject({ eligibleThisYear: true, nextYear: 2026 });
    expect(itemOf(result, "liver")).toMatchObject({ eligibleThisYear: true, conditional: true });
    expect(itemOf(result, "colorectal")).toMatchObject({ eligibleThisYear: false, nextYear: 2036 });
    expect(result.eligibleCount).toBe(2);
    expect(result.age).toBe(40);
    expect(result.items.map((i) => i.itemId)).not.toContain("breast");
    expect(result.items.map((i) => i.itemId)).not.toContain("cervical");
  });

  it("F1-AC-2[P0]: should make 1987 nonoffice general eligible, and 1987 office general 2027 with the odd-year reason", () => {
    const nonoffice = evaluateProfile(profile(1987, "male", "employee_nonoffice"), [], TODAY);
    const office = evaluateProfile(profile(1987, "male", "employee_office"), [], TODAY);

    expect(itemOf(nonoffice, "general").eligibleThisYear).toBe(true);
    expect(itemOf(office, "general")).toMatchObject({
      eligibleThisYear: false,
      nextYear: 2027,
      reason: "2027년 대상(홀수년 출생)",
    });
  });

  it("F1-AC-3[P0]: should mark 1966 female dependent with 5 eligible items and liver/lung as conditional", () => {
    const result = evaluateProfile(profile(1966, "female", "dependent"), [], TODAY);

    for (const id of ["general", "stomach", "colorectal", "breast", "cervical"] as const) {
      expect(itemOf(result, id).eligibleThisYear).toBe(true);
    }
    expect(itemOf(result, "liver")).toMatchObject({ eligibleThisYear: true, conditional: true });
    expect(itemOf(result, "lung")).toMatchObject({ eligibleThisYear: true, conditional: true });
    expect(result.eligibleCount).toBe(5);
  });

  it("F1-AC-4[P0]: should report received general as next-year-based, sum nextCheckupYear 2028 for general+stomach, and ignore a 2025 record in 2026", () => {
    const office1986 = evaluateProfile(
      profile(1986, "male", "employee_office"),
      [record("general", 2026), record("stomach", 2026)],
      TODAY,
    );
    const nonoffice1990 = evaluateProfile(
      profile(1990, "male", "employee_nonoffice"),
      [record("general", 2026)],
      TODAY,
    );
    const office1985 = evaluateProfile(profile(1985, "male", "employee_office"), [record("general", 2025)], TODAY);

    expect(itemOf(office1986, "general")).toMatchObject({ received: true, nextYear: 2028 });
    expect(itemOf(nonoffice1990, "general")).toMatchObject({ received: true, nextYear: 2027 });
    expect(office1986.nextCheckupYear).toBe(2028);
    expect(office1986.receivedCount).toBe(2);
    expect(itemOf(office1985, "general")).toMatchObject({ eligibleThisYear: false, nextYear: 2027 });
    expect(office1985.receivedCount).toBe(0);
  });

  it("F1-AC-5[P0]: should return the date-only days left to Dec 31 — 82 on Oct 10, 30 on Dec 1, 0 on Dec 31 23:59", () => {
    expect(daysUntilYearEnd(new Date(2026, 9, 10))).toBe(82);
    expect(daysUntilYearEnd(new Date(2026, 11, 1))).toBe(30);
    expect(daysUntilYearEnd(new Date(2026, 11, 31, 23, 59))).toBe(0);
  });

  it("F1-AC-6[P1]: should exclude 1960 medical_aid from general with the age reason, null lung nextYear for 1950, and 2028 for 2008 female dependent", () => {
    const old = evaluateProfile(profile(1960, "male", "medical_aid"), [], TODAY);
    const oldest = evaluateProfile(profile(1950, "male", "employee_office"), [], TODAY);
    const young = evaluateProfile(profile(2008, "female", "dependent"), [], TODAY);

    expect(itemOf(old, "general")).toMatchObject({
      eligibleThisYear: false,
      nextYear: null,
      reason: "대상 연령(19~64세)이 아니에요",
    });
    expect(itemOf(oldest, "lung").nextYear).toBeNull();
    expect(itemOf(young, "general").nextYear).toBe(2028);
    expect(itemOf(young, "cervical").nextYear).toBe(2028);
  });

  it("F1-AC-7[P1]: should throw RangeError('INVALID_BIRTH_YEAR') from evaluateProfile and return false from isEvaluable for 1919 and 2027", () => {
    expect(() => evaluateProfile(profile(1919, "male", "employee_office"), [], TODAY)).toThrow(RangeError);
    expect(() => evaluateProfile(profile(2027, "male", "employee_office"), [], TODAY)).toThrow(
      new RangeError("INVALID_BIRTH_YEAR"),
    );
    expect(isEvaluable(1919, TODAY)).toBe(false);
    expect(isEvaluable(2027, TODAY)).toBe(false);
    expect(isEvaluable(1986, TODAY)).toBe(true);
  });

  it("F3-AC-8·F8-AC-4·rules: should keep the 7 rules in SPEC order, the 3 insurance descriptions, and the stomach source line", () => {
    expect(CHECKUP_RULES.map((r) => r.id)).toEqual([
      "general",
      "stomach",
      "colorectal",
      "breast",
      "cervical",
      "liver",
      "lung",
    ]);

    const descriptionOf = (value: InsuranceType) => INSURANCE_OPTIONS.find((o) => o.value === value)?.description;
    expect(INSURANCE_OPTIONS).toHaveLength(5);
    expect(descriptionOf("employee_nonoffice")).toBe("매년 검진 대상이에요");
    expect(descriptionOf("dependent")).toBe("만 20세 이상부터 대상이에요");
    expect(descriptionOf("medical_aid")).toBe("만 19~64세가 대상이에요");

    expect(formatRuleLine("stomach")).toBe("위암 검진 · 만 40세 이상 · 2년마다 · 암관리법 시행령 별표1");
  });
});
