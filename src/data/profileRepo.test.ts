import { describe, it, expect, beforeEach } from "vitest";
import { addProfile, updateProfile, deleteProfile } from "@/data/profileRepo";
import { KEYS } from "@/data/storage";
import type { Profile } from "@/lib/types";

const NOW = "2026-10-10T00:00:00.000Z";
const LATER = "2026-11-01T00:00:00.000Z";

const base: Profile = {
  id: "p-self",
  name: "나",
  role: "self",
  birthYear: 1986,
  sex: "male",
  insuranceType: "employee_office",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const mom: Profile = { ...base, id: "p-mom", name: "엄마", role: "family", sex: "female" };

beforeEach(() => {
  localStorage.clear();
});

describe("profileRepo", () => {
  it("addProfile은 입력 스냅샷을 바꾸지 않고 새 배열을 돌려준다", () => {
    const input = { profiles: [base], records: [] };
    const { next } = addProfile(
      input,
      { name: "아빠", role: "family", birthYear: 1958, sex: "male", insuranceType: "dependent" },
      NOW,
    );
    expect(input.profiles).toHaveLength(1);
    expect(next.profiles).toHaveLength(2);
    expect(next.profiles).not.toBe(input.profiles);
  });

  it("updateProfile은 updatedAt만 갱신하고 createdAt·id는 유지한다", () => {
    const { result, next } = updateProfile({ profiles: [base, mom], records: [] }, mom.id, { birthYear: 1961 }, LATER);
    expect(result).toEqual({ ok: true });
    const updated = next.profiles.find((p) => p.id === mom.id);
    expect(updated?.birthYear).toBe(1961);
    expect(updated?.createdAt).toBe(mom.createdAt);
    expect(updated?.updatedAt).toBe(LATER);
  });

  it("자기 이름 그대로 수정해도 DUPLICATE_NAME이 아니다", () => {
    const { result } = updateProfile({ profiles: [base, mom], records: [] }, mom.id, { name: "엄마" }, LATER);
    expect(result).toEqual({ ok: true });
  });

  it("family를 self로 바꾸려 하면 SELF_EXISTS다", () => {
    const { result } = updateProfile({ profiles: [base, mom], records: [] }, mom.id, { role: "self" }, LATER);
    expect(result).toEqual({ ok: false, error: "SELF_EXISTS" });
  });

  it("deleteProfile은 profiles를 저장소에서도 지운다", () => {
    deleteProfile({ profiles: [base, mom], records: [] }, mom.id);
    const stored = JSON.parse(localStorage.getItem(KEYS.profiles) ?? "{}");
    expect(stored.data.map((p: Profile) => p.id)).toEqual([base.id]);
  });
});
