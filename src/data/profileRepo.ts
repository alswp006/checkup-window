import type { CheckupRecord, Profile, StoreResult } from "@/lib/types";
import { KEYS, newId, writeEnvelope } from "@/data/storage";

export interface ProfileSnapshot {
  profiles: Profile[];
  records: CheckupRecord[];
}

export type ProfileInput = Omit<Profile, "id" | "createdAt" | "updatedAt">;
export type ProfilePatch = Partial<ProfileInput>;

export interface RepoResult {
  result: StoreResult;
  next: ProfileSnapshot;
}

const MAX_FAMILY = 9;

type Failure = Extract<StoreResult, { ok: false }>;

/** 역할·이름 규칙 검사. 순서: SELF_EXISTS → FAMILY_LIMIT → DUPLICATE_NAME. */
function validate(others: Profile[], role: Profile["role"], name: string): Failure | null {
  if (role === "self" && others.some((p) => p.role === "self")) {
    return { ok: false, error: "SELF_EXISTS" };
  }
  if (role === "family" && others.filter((p) => p.role === "family").length >= MAX_FAMILY) {
    return { ok: false, error: "FAMILY_LIMIT" };
  }
  if (others.some((p) => p.name === name)) {
    return { ok: false, error: "DUPLICATE_NAME" };
  }
  return null;
}

export function addProfile(snapshot: ProfileSnapshot, input: ProfileInput, now: string): RepoResult {
  const failure = validate(snapshot.profiles, input.role, input.name);
  if (failure) return { result: failure, next: snapshot };

  const profile: Profile = { ...input, id: newId(), createdAt: now, updatedAt: now };
  const profiles = [...snapshot.profiles, profile];
  const written = writeEnvelope(KEYS.profiles, profiles);
  if (!written.ok) return { result: written, next: snapshot };
  return { result: { ok: true }, next: { profiles, records: snapshot.records } };
}

export function updateProfile(
  snapshot: ProfileSnapshot,
  id: string,
  patch: ProfilePatch,
  now: string,
): RepoResult {
  const target = snapshot.profiles.find((p) => p.id === id);
  if (!target) return { result: { ok: true }, next: snapshot };

  const merged: Profile = { ...target, ...patch, id: target.id, createdAt: target.createdAt, updatedAt: now };
  const others = snapshot.profiles.filter((p) => p.id !== id);
  const failure = validate(others, merged.role, merged.name);
  if (failure) return { result: failure, next: snapshot };

  const profiles = snapshot.profiles.map((p) => (p.id === id ? merged : p));
  const written = writeEnvelope(KEYS.profiles, profiles);
  if (!written.ok) return { result: written, next: snapshot };
  return { result: { ok: true }, next: { profiles, records: snapshot.records } };
}

export function deleteProfile(snapshot: ProfileSnapshot, id: string): RepoResult {
  if (!snapshot.profiles.some((p) => p.id === id)) return { result: { ok: true }, next: snapshot };

  const profiles = snapshot.profiles.filter((p) => p.id !== id);
  const records = snapshot.records.filter((r) => r.profileId !== id);

  const profilesWritten = writeEnvelope(KEYS.profiles, profiles);
  if (!profilesWritten.ok) return { result: profilesWritten, next: snapshot };

  if (records.length !== snapshot.records.length) {
    const recordsWritten = writeEnvelope(KEYS.records, records);
    if (!recordsWritten.ok) {
      // 기록 쓰기가 실패하면 프로필 삭제도 되돌려 둘이 어긋나지 않게 한다.
      writeEnvelope(KEYS.profiles, snapshot.profiles);
      return { result: recordsWritten, next: snapshot };
    }
  }
  return { result: { ok: true }, next: { profiles, records } };
}
