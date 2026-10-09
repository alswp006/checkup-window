import type { CheckupItemId, CheckupRecord, StoreResult } from "@/lib/types";
import { KEYS, removeKeys, writeEnvelope, writeJson } from "@/data/storage";
import type { ProfileSnapshot, RepoResult } from "@/data/profileRepo";

/** 보관 기간(년). year < 올해 − RETENTION_YEARS인 기록은 정리한다. */
const RETENTION_YEARS = 5;

export function pruneRecords(records: CheckupRecord[], thisYear: number): CheckupRecord[] {
  return records.filter((r) => r.year >= thisYear - RETENTION_YEARS);
}

/** (profileId, itemId, year)가 있으면 지우고 없으면 넣는다. 저장 실패면 snapshot을 그대로 돌려준다. */
export function toggleRecord(
  snapshot: ProfileSnapshot,
  profileId: string,
  itemId: CheckupItemId,
  year: number,
  now: string,
): RepoResult {
  const isSame = (r: CheckupRecord) => r.profileId === profileId && r.itemId === itemId && r.year === year;
  const exists = snapshot.records.some(isSame);
  const toggled = exists
    ? snapshot.records.filter((r) => !isSame(r))
    : [...snapshot.records, { profileId, itemId, year, receivedAt: now }];

  const records = pruneRecords(toggled, Number(now.slice(0, 4)));
  const written = writeEnvelope(KEYS.records, records);
  if (!written.ok) return { result: written, next: snapshot };
  return { result: { ok: true }, next: { profiles: snapshot.profiles, records } };
}

export function dismissBanner(month: string): StoreResult {
  return writeJson(KEYS.banner, { dismissedMonth: month });
}

/** 키 3개를 지운다. removeItem 예외는 { ok: false }로 바꾸고 throw하지 않는다. */
export function resetAll(): StoreResult {
  return removeKeys([KEYS.profiles, KEYS.records, KEYS.banner]);
}
