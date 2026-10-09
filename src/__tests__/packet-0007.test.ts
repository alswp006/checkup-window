/**
 * 프로필 CRUD — profileRepo 순수 함수 테스트.
 *
 * 데이터 계층(src/data/profileRepo.ts)은 UI가 없으므로 TDS·라우터·AppState 목은 걸지 않는다.
 * 저장은 localStorage 실물로 확인한다(seed → 호출 → raw 문자열 단언).
 *
 * 계약 메모(구현 전 고정):
 * - addProfile(snapshot, input, now) / updateProfile(snapshot, id, patch, now) / deleteProfile(snapshot, id)
 *   snapshot = { profiles: Profile[], records: CheckupRecord[] }
 *   반환 = { result: StoreResult, next } — next는 새 스냅샷. STORAGE_FULL이면 next는 입력 스냅샷과 같고
 *   저장값(바이트)도 그대로다.
 * - now는 ISO 문자열이다. createdAt·updatedAt에 그대로 들어간다(Date 객체가 아니다).
 * - 성공할 때만 writeEnvelope(KEYS.profiles, ...)로 쓴다. deleteProfile은 records도 같이 쓴다.
 * - 검사 순서: SELF_EXISTS → FAMILY_LIMIT(가족 9명) → DUPLICATE_NAME → STORAGE_FULL.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { addProfile, updateProfile, deleteProfile } from "@/data/profileRepo";
import { KEYS } from "@/data/storage";
import type { CheckupRecord, Profile } from "@/lib/types";

const NOW = "2026-10-10T00:00:00.000Z";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

type Snapshot = { profiles: Profile[]; records: CheckupRecord[] };

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

const mom: Profile = { ...self, id: "p-mom", name: "엄마", role: "family", birthYear: 1960, sex: "female" };
const dad: Profile = { ...self, id: "p-dad", name: "아빠", role: "family", birthYear: 1958, sex: "male" };

const familyOf = (i: number): Profile => ({ ...mom, id: `p-f${i}`, name: `가족${i}` });

const rec = (profileId: string, itemId: CheckupRecord["itemId"], year: number): CheckupRecord => ({
  profileId,
  itemId,
  year,
  receivedAt: "2026-03-01T00:00:00.000Z",
});

const snap = (profiles: Profile[] = [], records: CheckupRecord[] = []): Snapshot => ({ profiles, records });

// 저장소에 엔벨로프를 직접 심는다 — 입력 상태를 localStorage 실물로 만든다.
const seed = (key: string, data: unknown[]) => {
  localStorage.setItem(key, JSON.stringify({ version: 1, data }));
};

const readStored = <T>(key: string): T[] => {
  const raw = localStorage.getItem(key);
  return raw === null ? [] : (JSON.parse(raw).data as T[]);
};

type ProfileInput = Omit<Profile, "id" | "createdAt" | "updatedAt">;

const selfInput: ProfileInput = { name: "나", role: "self", birthYear: 1986, sex: "male", insuranceType: "employee_office" };
const familyInput = (name: string): ProfileInput => ({ name, role: "family", birthYear: 1960, sex: "female", insuranceType: "dependent" });

describe("프로필 CRUD — profileRepo", () => {
  it("AC-1[P0]: 빈 저장소에 본인을 추가하면 ok:true이고, profiles.v1에 id·createdAt·updatedAt이 채워진 프로필 1개가 저장된다", () => {
    const { result, next } = addProfile(snap(), selfInput, NOW);

    expect(result).toEqual({ ok: true });
    const stored = readStored<Profile>(KEYS.profiles);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toEqual(expect.any(String));
    expect(stored[0].id.length).toBeGreaterThan(0);
    expect(stored[0].name).toBe("나");
    expect(stored[0].role).toBe("self");
    expect(stored[0].createdAt).toBe(NOW);
    expect(stored[0].updatedAt).toBe(NOW);
    expect(next.profiles).toHaveLength(1);
  });

  it("AC-3[P0]: self가 이미 있으면 role 'self' 추가는 SELF_EXISTS이고 저장된 profiles 길이는 1로 남는다", () => {
    seed(KEYS.profiles, [self]);
    const before = localStorage.getItem(KEYS.profiles);

    const { result } = addProfile(snap([self]), { ...selfInput, name: "다른나" }, NOW);

    expect(result).toEqual({ ok: false, error: "SELF_EXISTS" });
    expect(readStored<Profile>(KEYS.profiles)).toHaveLength(1);
    expect(localStorage.getItem(KEYS.profiles)).toBe(before);
  });

  it("AC-6[P1]: 가족 9명이 있으면 10번째 family 추가는 FAMILY_LIMIT이다", () => {
    const family = Array.from({ length: 9 }, (_, i) => familyOf(i + 1));
    seed(KEYS.profiles, [self, ...family]);

    const { result } = addProfile(snap([self, ...family]), familyInput("막내"), NOW);

    expect(result).toEqual({ ok: false, error: "FAMILY_LIMIT" });
    expect(readStored<Profile>(KEYS.profiles)).toHaveLength(10);
  });

  it("AC-6[P1]: '엄마'가 있을 때 '엄마'를 추가하거나 다른 프로필을 '엄마'로 바꾸면 DUPLICATE_NAME이다", () => {
    seed(KEYS.profiles, [self, mom, dad]);
    const base = snap([self, mom, dad]);

    const added = addProfile(base, familyInput("엄마"), NOW);
    expect(added.result).toEqual({ ok: false, error: "DUPLICATE_NAME" });

    const renamed = updateProfile(base, dad.id, { name: "엄마" }, NOW);
    expect(renamed.result).toEqual({ ok: false, error: "DUPLICATE_NAME" });
    expect(readStored<Profile>(KEYS.profiles).find((p) => p.id === dad.id)?.name).toBe("아빠");
  });

  it("AC-5[P1]: setItem이 QuotaExceededError를 던지면 STORAGE_FULL이고, next는 입력 스냅샷과 같으며 저장값도 그대로다", () => {
    seed(KEYS.profiles, [self]);
    const original = localStorage.getItem(KEYS.profiles);
    const input = snap([self]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    const { result, next } = addProfile(input, familyInput("엄마"), NOW);

    expect(result).toEqual({ ok: false, error: "STORAGE_FULL" });
    expect(next).toEqual(input);
    expect(localStorage.getItem(KEYS.profiles)).toBe(original);
  });

  it("AC-8[P1]: 엄마 기록 3건이 있을 때 deleteProfile(엄마.id)는 엄마 기록을 0건으로 만들고 다른 프로필의 기록 수는 그대로다", () => {
    const records = [
      rec(mom.id, "general", 2025),
      rec(mom.id, "stomach", 2025),
      rec(mom.id, "breast", 2026),
      rec(self.id, "general", 2026),
      rec(self.id, "liver", 2026),
    ];
    seed(KEYS.profiles, [self, mom]);
    seed(KEYS.records, records);

    const { result, next } = deleteProfile(snap([self, mom], records), mom.id);

    expect(result).toEqual({ ok: true });
    expect(next.records.filter((r) => r.profileId === mom.id)).toHaveLength(0);
    expect(next.records.filter((r) => r.profileId === self.id)).toHaveLength(2);
    expect(readStored<CheckupRecord>(KEYS.records)).toHaveLength(2);
    expect(readStored<Profile>(KEYS.profiles).map((p) => p.id)).toEqual([self.id]);
  });
});
