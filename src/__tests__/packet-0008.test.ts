/**
 * 수검 기록 토글·배너 닫기·전체 초기화 — recordRepo 순수 함수 테스트.
 *
 * 데이터 계층(src/data/recordRepo.ts)은 UI가 없으므로 TDS·라우터·AppState 목은 걸지 않는다.
 * 저장은 localStorage 실물로 확인한다(seed → 호출 → raw 문자열 단언).
 *
 * 계약 메모(구현 전 고정):
 * - toggleRecord(snapshot, profileId, itemId, year, now) → RepoResult = { result: StoreResult, next }
 *   snapshot = { profiles: Profile[], records: CheckupRecord[] } (profileRepo와 같은 모양)
 *   유일키 = (profileId, itemId, year). 있으면 지우고, 없으면 { profileId, itemId, year, receivedAt: now }를 넣는다.
 *   저장 전에 pruneRecords(…, 올해)를 적용한다. 올해 = now의 연도(ISO 문자열 앞 4자리).
 *   쓰기 실패(STORAGE_FULL)면 next는 입력 snapshot과 같은 객체이고 저장값도 그대로다.
 * - pruneRecords(records, thisYear) → CheckupRecord[] — year < thisYear − 5인 기록을 뺀 새 배열.
 * - dismissBanner(month: string) → StoreResult — KEYS.banner에 { dismissedMonth: month }를 쓴다.
 * - resetAll() → StoreResult — KEYS.profiles·KEYS.records·KEYS.banner 세 키를 지운다.
 *   removeItem이 예외를 던지면 { ok: false, error: "STORAGE_FULL" }(removeKeys와 같은 실패 형태).
 *   throw하지 않고 console.error도 남기지 않는다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toggleRecord, pruneRecords, dismissBanner, resetAll } from "@/data/recordRepo";
import { KEYS } from "@/data/storage";
import type { CheckupRecord, Profile } from "@/lib/types";

const NOW = "2026-10-10T00:00:00.000Z";

const self: Profile = {
  id: "p-self",
  name: "나",
  role: "self",
  birthYear: 1986,
  sex: "male",
  insuranceType: "employee_office",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const emptySnapshot = { profiles: [self], records: [] as CheckupRecord[] };

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordRepo — 수검 기록 토글·배너 닫기·전체 초기화", () => {
  it("AC-1: toggleRecord를 같은 인자로 두 번 부르면 1건 늘었다가 그 1건이 지워져 0건이다", () => {
    const first = toggleRecord(emptySnapshot, self.id, "general", 2026, NOW);
    expect(first.result).toEqual({ ok: true });
    expect(first.next.records).toHaveLength(1);
    expect(first.next.records[0]).toEqual({ profileId: "p-self", itemId: "general", year: 2026, receivedAt: NOW });

    const second = toggleRecord(first.next, self.id, "general", 2026, NOW);
    expect(second.result).toEqual({ ok: true });
    expect(second.next.records).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(KEYS.records) ?? "{}").data).toEqual([]);
  });

  it("AC-1: 유일키는 (profileId, itemId, year) 전체이므로 연도가 다르면 별개 기록이다", () => {
    const a = toggleRecord(emptySnapshot, self.id, "general", 2026, NOW);
    const b = toggleRecord(a.next, self.id, "general", 2025, NOW);
    expect(b.next.records).toHaveLength(2);
    expect(b.next.records.map((r) => r.year)).toEqual([2026, 2025]);

    const c = toggleRecord(b.next, self.id, "general", 2026, NOW);
    expect(c.next.records).toHaveLength(1);
    expect(c.next.records[0].year).toBe(2025);
  });

  it("AC-2: pruneRecords는 year 2020 기록을 지우고 2021 기록은 남긴다(올해 2026 기준)", () => {
    const records: CheckupRecord[] = [
      { profileId: "p-self", itemId: "general", year: 2020, receivedAt: "2020-03-01" },
      { profileId: "p-self", itemId: "general", year: 2021, receivedAt: "2021-03-01" },
    ];
    const pruned = pruneRecords(records, 2026);
    expect(pruned.map((r) => r.year)).toEqual([2021]);
    expect(pruned[0].receivedAt).toBe("2021-03-01");
  });

  it("AC-2: toggleRecord는 저장할 때 2020 기록을 정리한 목록을 쓴다", () => {
    const snapshot = {
      profiles: [self],
      records: [{ profileId: "p-self", itemId: "general" as const, year: 2020, receivedAt: "2020-03-01" }],
    };
    const { next, result } = toggleRecord(snapshot, self.id, "general", 2026, NOW);
    expect(result).toEqual({ ok: true });
    expect(next.records.map((r) => r.year)).toEqual([2026]);

    const stored = JSON.parse(localStorage.getItem(KEYS.records) ?? "{}");
    expect(stored.version).toBe(1);
    expect(stored.data.map((r: CheckupRecord) => r.year)).toEqual([2026]);
  });

  it("AC-2: 쓰기가 실패하면 next는 입력 snapshot과 같고 STORAGE_FULL을 돌려준다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const { result, next } = toggleRecord(emptySnapshot, self.id, "general", 2026, NOW);
    expect(result).toEqual({ ok: false, error: "STORAGE_FULL" });
    expect(next).toBe(emptySnapshot);
    expect(next.records).toHaveLength(0);
  });

  it("AC-3: dismissBanner('2026-10')는 banner 키에 { dismissedMonth: '2026-10' }을 저장하고 { ok: true }를 반환한다", () => {
    const result = dismissBanner("2026-10");
    expect(result).toEqual({ ok: true });
    expect(JSON.parse(localStorage.getItem(KEYS.banner) ?? "null")).toEqual({ dismissedMonth: "2026-10" });
  });

  it("AC-4: resetAll()은 profiles.v1·records.v1·banner.v1 세 키를 모두 지운다", () => {
    localStorage.setItem(KEYS.profiles, JSON.stringify({ version: 1, data: [self] }));
    localStorage.setItem(KEYS.records, JSON.stringify({ version: 1, data: [] }));
    localStorage.setItem(KEYS.banner, JSON.stringify({ dismissedMonth: "2026-10" }));

    expect(resetAll()).toEqual({ ok: true });
    expect(localStorage.getItem("checkupWindow.profiles.v1")).toBeNull();
    expect(localStorage.getItem("checkupWindow.records.v1")).toBeNull();
    expect(localStorage.getItem("checkupWindow.banner.v1")).toBeNull();
  });

  it("AC-5: removeItem이 예외를 던지면 resetAll은 { ok: false }를 반환하고 throw·console.error는 0회다", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let result: ReturnType<typeof resetAll> | undefined;
    expect(() => {
      result = resetAll();
    }).not.toThrow();
    expect(result).toEqual({ ok: false, error: "STORAGE_FULL" });
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });
});
