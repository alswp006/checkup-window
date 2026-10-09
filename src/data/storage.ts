import type { BannerState, StoreResult } from "@/lib/types";
import { CHECKUP_RULES, INSURANCE_OPTIONS } from "@/domain/rules";

export const KEYS = {
  profiles: "checkupWindow.profiles.v1",
  records: "checkupWindow.records.v1",
  banner: "checkupWindow.banner.v1",
} as const;

const MIN_BIRTH_YEAR = 1920;
const MAX_PROFILES = 10;

const SEXES: readonly string[] = ["male", "female"];
const ROLES: readonly string[] = ["self", "family"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** profiles 엔벨로프의 data 검증 — 길이·중복·self 개수·필드 범위를 모두 본다. */
export function isProfileList(v: unknown, currentYear: number): boolean {
  if (!Array.isArray(v) || v.length > MAX_PROFILES) return false;
  const insuranceValues: readonly string[] = INSURANCE_OPTIONS.map((o) => o.value);
  const ids = new Set<string>();
  let selfCount = 0;
  for (const p of v) {
    if (!isRecord(p)) return false;
    if (typeof p.id !== "string" || p.id === "" || ids.has(p.id)) return false;
    ids.add(p.id);
    if (typeof p.name !== "string" || p.name.length < 1 || p.name.length > 10) return false;
    if (typeof p.role !== "string" || !ROLES.includes(p.role)) return false;
    if (p.role === "self") selfCount += 1;
    if (
      typeof p.birthYear !== "number" ||
      !Number.isInteger(p.birthYear) ||
      p.birthYear < MIN_BIRTH_YEAR ||
      p.birthYear > currentYear
    ) {
      return false;
    }
    if (typeof p.sex !== "string" || !SEXES.includes(p.sex)) return false;
    if (typeof p.insuranceType !== "string" || !insuranceValues.includes(p.insuranceType)) return false;
    if (typeof p.createdAt !== "string" || typeof p.updatedAt !== "string") return false;
  }
  return selfCount <= 1;
}

/** records 엔벨로프의 data 검증. */
export function isRecordList(v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  const itemIds: readonly string[] = CHECKUP_RULES.map((r) => r.id);
  return v.every(
    (r) =>
      isRecord(r) &&
      typeof r.profileId === "string" &&
      typeof r.itemId === "string" &&
      itemIds.includes(r.itemId) &&
      typeof r.year === "number" &&
      Number.isInteger(r.year) &&
      typeof r.receivedAt === "string",
  );
}

/**
 * 엔벨로프({ version: 1, data })를 읽는다. validateItem은 data 배열 전체를 받는다.
 * 파싱 실패·모양 불일치·검증 실패면 원본을 `${key}.corrupt`에 보관하고 recovered: true.
 */
export function readEnvelope<T = unknown>(
  key: string,
  validateItem: (data: unknown) => boolean,
): { data: T[]; recovered: boolean } {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return { data: [], recovered: false };
  }
  if (raw === null) return { data: [], recovered: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.data) && validateItem(parsed.data)) {
      return { data: parsed.data as T[], recovered: false };
    }
  } catch {
    // 파싱 실패 → 아래 손상 경로
  }

  try {
    localStorage.setItem(`${key}.corrupt`, raw);
  } catch {
    // 보관 실패는 무시 — 복구 자체는 계속한다
  }
  return { data: [], recovered: true };
}

/** 값을 JSON으로 저장. setItem 예외(QuotaExceededError 등)는 STORAGE_FULL로 바꾸고 기존 값은 건드리지 않는다. */
export function writeJson(key: string, value: unknown): StoreResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: "STORAGE_FULL" };
  }
}

export function writeEnvelope(key: string, data: unknown[]): StoreResult {
  return writeJson(key, { version: 1, data });
}

export function removeKeys(keys: readonly string[]): StoreResult {
  try {
    for (const k of keys) localStorage.removeItem(k);
    return { ok: true };
  } catch {
    return { ok: false, error: "STORAGE_FULL" };
  }
}

export function readBanner(): BannerState {
  const fallback: BannerState = { dismissedMonth: null };
  try {
    const raw = localStorage.getItem(KEYS.banner);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && (parsed.dismissedMonth === null || typeof parsed.dismissedMonth === "string")) {
      return { dismissedMonth: parsed.dismissedMonth };
    }
  } catch {
    // 파싱 불가 → 기본값
  }
  return fallback;
}

export function newId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
