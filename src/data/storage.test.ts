import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KEYS, readEnvelope, writeEnvelope, removeKeys, readBanner, isProfileList, isRecordList } from "@/data/storage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const profile = {
  id: "p1",
  name: "나",
  role: "self",
  birthYear: 1986,
  sex: "male",
  insuranceType: "employee_office",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};
const check = (v: unknown) => isProfileList(v, 2026);

describe("isProfileList / readEnvelope", () => {
  it("정상 1986 프로필은 recovered false", () => {
    localStorage.setItem(KEYS.profiles, JSON.stringify({ version: 1, data: [profile] }));
    const r = readEnvelope(KEYS.profiles, check);
    expect(r.recovered).toBe(false);
    expect(r.data).toHaveLength(1);
  });

  it("값이 없으면 빈 배열, recovered false", () => {
    expect(readEnvelope(KEYS.profiles, check)).toEqual({ data: [], recovered: false });
  });

  it.each([1900, 2027, 1986.5])("birthYear %s는 손상으로 처리한다", (birthYear) => {
    const raw = JSON.stringify({ version: 1, data: [{ ...profile, birthYear }] });
    localStorage.setItem(KEYS.profiles, raw);
    expect(readEnvelope(KEYS.profiles, check)).toEqual({ data: [], recovered: true });
    expect(localStorage.getItem(`${KEYS.profiles}.corrupt`)).toBe(raw);
  });

  it("self 2개, version 불일치는 손상이다", () => {
    const two = JSON.stringify({ version: 1, data: [profile, { ...profile, id: "p2" }] });
    localStorage.setItem(KEYS.profiles, two);
    expect(readEnvelope(KEYS.profiles, check).recovered).toBe(true);
    localStorage.setItem(KEYS.profiles, JSON.stringify({ version: 2, data: [] }));
    expect(readEnvelope(KEYS.profiles, check).recovered).toBe(true);
  });

  it("알 수 없는 itemId 기록은 손상이다", () => {
    const rec = { profileId: "p1", itemId: "heart", year: 2026, receivedAt: "2026-10-01" };
    localStorage.setItem(KEYS.records, JSON.stringify({ version: 1, data: [rec] }));
    expect(readEnvelope(KEYS.records, isRecordList).recovered).toBe(true);
  });
});

describe("쓰기·배너", () => {
  it("writeEnvelope 라운드트립", () => {
    expect(writeEnvelope(KEYS.profiles, [profile])).toEqual({ ok: true });
    expect(readEnvelope(KEYS.profiles, check).data).toEqual([profile]);
  });

  it("쿼터 오류는 STORAGE_FULL로 바뀐다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(writeEnvelope(KEYS.profiles, [])).toEqual({ ok: false, error: "STORAGE_FULL" });
  });

  it("removeKeys는 예외를 결과값으로 바꾼다", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(removeKeys([KEYS.profiles])).toEqual({ ok: false, error: "STORAGE_FULL" });
  });

  it("손상된 배너 값은 null이다", () => {
    localStorage.setItem(KEYS.banner, "{oops");
    expect(readBanner()).toEqual({ dismissedMonth: null });
    localStorage.setItem(KEYS.banner, JSON.stringify({ dismissedMonth: 5 }));
    expect(readBanner()).toEqual({ dismissedMonth: null });
  });
});
