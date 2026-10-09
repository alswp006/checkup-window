import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toggleRecord, pruneRecords, dismissBanner, resetAll } from "@/data/recordRepo";
import { KEYS } from "@/data/storage";
import type { CheckupRecord } from "@/lib/types";

const NOW = "2026-10-10T00:00:00.000Z";
const empty = { profiles: [], records: [] as CheckupRecord[] };

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("recordRepo", () => {
  it("toggleRecord: 같은 인자로 두 번 부르면 추가 후 삭제된다", () => {
    const a = toggleRecord(empty, "p1", "general", 2026, NOW);
    expect(a.next.records).toHaveLength(1);
    const b = toggleRecord(a.next, "p1", "general", 2026, NOW);
    expect(b.next.records).toHaveLength(0);
  });

  it("pruneRecords: 2020은 지우고 2021은 남긴다", () => {
    const records: CheckupRecord[] = [
      { profileId: "p1", itemId: "general", year: 2020, receivedAt: "2020-03-01" },
      { profileId: "p1", itemId: "general", year: 2021, receivedAt: "2021-03-01" },
    ];
    expect(pruneRecords(records, 2026).map((r) => r.year)).toEqual([2021]);
  });

  it("toggleRecord: 쓰기 실패 시 snapshot을 그대로 둔다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const r = toggleRecord(empty, "p1", "general", 2026, NOW);
    expect(r.result).toEqual({ ok: false, error: "STORAGE_FULL" });
    expect(r.next).toBe(empty);
  });

  it("dismissBanner: banner 키에 저장한다", () => {
    expect(dismissBanner("2026-10")).toEqual({ ok: true });
    expect(JSON.parse(localStorage.getItem(KEYS.banner) ?? "null")).toEqual({ dismissedMonth: "2026-10" });
  });

  it("resetAll: 세 키를 지운다", () => {
    localStorage.setItem(KEYS.profiles, "{}");
    localStorage.setItem(KEYS.records, "{}");
    localStorage.setItem(KEYS.banner, "{}");
    expect(resetAll()).toEqual({ ok: true });
    expect(localStorage.getItem(KEYS.profiles)).toBeNull();
    expect(localStorage.getItem(KEYS.records)).toBeNull();
    expect(localStorage.getItem(KEYS.banner)).toBeNull();
  });

  it("resetAll: removeItem 예외는 { ok: false }, console.error 0회", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(resetAll()).toEqual({ ok: false, error: "STORAGE_FULL" });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
