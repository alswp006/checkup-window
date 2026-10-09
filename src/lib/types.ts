// Domain types — 올해검진
export type Sex = 'male' | 'female';

export type InsuranceType =
  | 'employee_office'
  | 'employee_nonoffice'
  | 'regional_head'
  | 'dependent'
  | 'medical_aid';

export type CheckupItemId =
  | 'general'
  | 'stomach'
  | 'colorectal'
  | 'breast'
  | 'cervical'
  | 'liver'
  | 'lung';

/** 검진 항목 규칙 (상수, 저장 안 함) */
export interface CheckupRule {
  id: CheckupItemId;
  label: string;
  cycle: 'annual' | 'biennial';
  minAge: number | null;
  maxAge: number | null;
  sex: Sex | null;
  conditional: boolean;
  conditionText: string | null;
  source: string;
}

/** localStorage 'checkupWindow.profiles.v1' = { version: 1, data: Profile[] } */
export interface Profile {
  id: string;
  name: string;
  role: 'self' | 'family';
  birthYear: number;
  sex: Sex;
  insuranceType: InsuranceType;
  createdAt: string;
  updatedAt: string;
}

/** localStorage 'checkupWindow.records.v1' = { version: 1, data: CheckupRecord[] } */
export interface CheckupRecord {
  profileId: string;
  itemId: CheckupItemId;
  year: number;
  receivedAt: string;
}

/** localStorage 'checkupWindow.banner.v1' */
export interface BannerState {
  dismissedMonth: string | null;
}

/** 계산 결과 (저장 안 함) */
export interface ItemStatus {
  itemId: CheckupItemId;
  label: string;
  eligibleThisYear: boolean;
  conditional: boolean;
  received: boolean;
  nextYear: number | null;
  reason: string;
}

export interface ProfileResult {
  profileId: string;
  year: number;
  age: number;
  items: ItemStatus[];
  eligibleCount: number;
  receivedCount: number;
  daysLeft: number;
  nextCheckupYear: number | null;
}

export interface PlanYear {
  year: number;
  items: ItemStatus[];
}

export type StoreResult =
  | { ok: true }
  | { ok: false; error: 'STORAGE_FULL' | 'FAMILY_LIMIT' | 'DUPLICATE_NAME' | 'SELF_EXISTS' };

/** 라우트 state */
export type HomeLocationState = { toast: 'saved' | 'deleted' } | null;
export type ProfileFormLocationState = { mode: 'self' | 'family' } | null;
