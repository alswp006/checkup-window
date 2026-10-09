/**
 * localStorage 원시 함수 + 읽기 검증기 + newId — 순수 함수 테스트.
 *
 * 저장 계층(src/data/storage.ts)은 UI가 없으므로 TDS·라우터·AppState 목은 걸지 않는다.
 * 날짜 의존 검증(birthYear 상한 = 올해)이 있어 Date만 고정한다(시계를 그대로 두면 달이 바뀔 때 빨개진다).
 *
 * 계약 메모(구현 전 고정):
 * - readEnvelope(key, validateItem): validateItem은 엔벨로프의 data 배열 전체를 받아 boolean을 돌려준다
 *   (task.md의 `readEnvelope(KEYS.profiles, v => isProfileList(v, year))` 형태). 파싱 실패·모양 불일치·
 *   validateItem false 중 하나면 손상으로 본다 → data: [], recovered: true, 원본은 '{key}.corrupt'에 그대로.
 * - writeEnvelope(key, data): 엔벨로프 { version: 1, data }를 저장하고 StoreResult를 돌려준다.
 *   setItem이 QuotaExceededError를 던지면 { ok: false, error: 'STORAGE_FULL' }, 기존 문자열은 건드리지 않는다.
 * - readBanner(): 'checkupWindow.banner.v1'을 읽는다. 파싱 불가면 { dismissedMonth: null }, throw하지 않는다.
 * - newId(): Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8). crypto.randomUUID 금지.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readEnvelope, writeEnvelope, readBanner, newId } from "@/data/storage";

const PROFILES_KEY = "checkupWindow.profiles.v1";
const BANNER_KEY = "checkupWindow.banner.v1";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// 항목 검증 규칙 — birthYear 정수 1920~올해, sex·insuranceType·role 허용값.
// 실제 허용값은 src/lib/types.ts의 Sex / InsuranceType / role 유니온과 같다.
const SEX = ["male", "female"];
const INSURANCE = ["employee_office", "employee_nonoffice", "regional_head", "dependent", "medical_aid"];
const ROLE = ["self", "family"];

const isProfileList = (v: unknown): boolean => {
  if (!Array.isArray(v)) return false;
  const year = new Date().getFullYear();
  return v.every((p) => {
    if (typeof p !== "object" || p === null) return false;
    const r = p as Record<string, unknown>;
    return (
      Number.isInteger(r.birthYear) &&
      (r.birthYear as number) >= 1920 &&
      (r.birthYear as number) <= year &&
      SEX.includes(r.sex as string) &&
      INSURANCE.includes(r.insuranceType as string) &&
      ROLE.includes(r.role as string)
    );
  });
};

const validProfile = {
  id: "p-self",
  name: "나",
  role: "self",
  birthYear: 1985,
  sex: "male",
  insuranceType: "employee_office",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

describe("localStorage 원시 함수 + 읽기 검증기 + newId", () => {
  it("AC-1[P0]: 파싱 불가 값('{oops')이면 data는 [], 원본은 '.corrupt' 키에 그대로, recovered는 true", () => {
    localStorage.setItem(PROFILES_KEY, "{oops");

    const result = readEnvelope(PROFILES_KEY, isProfileList);

    expect(result.data).toEqual([]);
    expect(result.recovered).toBe(true);
    expect(localStorage.getItem(`${PROFILES_KEY}.corrupt`)).toBe("{oops");
  });

  it("AC-1[P0]: 정상 엔벨로프는 data를 그대로 돌려주고 recovered는 false다 (happy path)", () => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify({ version: 1, data: [validProfile] }));

    const result = readEnvelope(PROFILES_KEY, isProfileList);

    expect(result.data).toEqual([validProfile]);
    expect(result.recovered).toBe(false);
    expect(localStorage.getItem(`${PROFILES_KEY}.corrupt`)).toBeNull();
  });

  it("AC-2[P0]: birthYear 1900 · birthYear 2099 · sex 'x' · role 'admin' 각각은 손상으로 처리된다", () => {
    const badItems = [
      { ...validProfile, birthYear: 1900 },
      { ...validProfile, birthYear: 2099 },
      { ...validProfile, sex: "x" },
      { ...validProfile, role: "admin" },
    ];

    for (const bad of badItems) {
      localStorage.clear();
      const raw = JSON.stringify({ version: 1, data: [bad] });
      localStorage.setItem(PROFILES_KEY, raw);

      const result = readEnvelope(PROFILES_KEY, isProfileList);

      expect(result.data).toEqual([]);
      expect(result.recovered).toBe(true);
      expect(localStorage.getItem(`${PROFILES_KEY}.corrupt`)).toBe(raw);
    }
  });

  it("AC-3[P0]: setItem이 QuotaExceededError를 던지면 STORAGE_FULL을 돌려주고 기존 저장 문자열은 바이트 단위로 그대로다", () => {
    const original = JSON.stringify({ version: 1, data: [validProfile] });
    localStorage.setItem(PROFILES_KEY, original);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    const result = writeEnvelope(PROFILES_KEY, [{ ...validProfile, id: "p-new" }]);

    expect(result).toEqual({ ok: false, error: "STORAGE_FULL" });
    expect(localStorage.getItem(PROFILES_KEY)).toBe(original);
  });

  it("AC-4[P1]: 'checkupWindow.banner.v1'이 파싱 불가면 readBanner()는 { dismissedMonth: null }을 돌려주고 throw하지 않는다", () => {
    localStorage.setItem(BANNER_KEY, "{oops");

    expect(() => readBanner()).not.toThrow();
    expect(readBanner()).toEqual({ dismissedMonth: null });
  });

  it("AC-4[P1]: 정상 배너 값은 그대로 읽는다 (happy path)", () => {
    localStorage.setItem(BANNER_KEY, JSON.stringify({ dismissedMonth: "2026-10" }));

    expect(readBanner()).toEqual({ dismissedMonth: "2026-10" });
  });

  it("AC-5[P1]: newId()는 'Date.now().toString(36)-Math.random().toString(36).slice(2,8)' 형식이고 crypto.randomUUID를 쓰지 않는다", () => {
    const randomUUID = vi.fn(() => "should-not-be-used");
    vi.stubGlobal("crypto", { randomUUID });
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const id = newId();
    const expected = `${Date.now().toString(36)}-${(0.123456789).toString(36).slice(2, 8)}`;

    expect(id).toBe(expected);
    expect(id).toMatch(/^[0-9a-z]+-[0-9a-z]{1,6}$/);
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it("AC-5[P1]: newId()를 1000회 호출해도 중복이 0개다", () => {
    const ids = Array.from({ length: 1000 }, () => newId());

    expect(new Set(ids).size).toBe(1000);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });
});
