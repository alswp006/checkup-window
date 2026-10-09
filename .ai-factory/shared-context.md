# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** localStorage 항목 id 생성. 0007 addProfile 등에서 사용. (구현: 패킷 0006) */
export type newIdFn = () => string;

/** 키 3개 삭제. removeItem 예외는 throw하지 않고 { ok: false }로 반환. 실패 시 console.error 없음. 0009 액션 및 0017 초기화에서 사용. (구현: 패킷 0008) */
export type resetAllFn = () => { ok: boolean };

/** isEvaluable이 false인 가족 이름으로 만든 안내 문구. 반환은 문자열로 가정. 0016·0018에서 사용. (구현: 패킷 0004) */
export type invalidFamilyLineFn = (name: string) => string;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.css
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    home/
  data/
    CheckupStoreProvider.test.tsx
    CheckupStoreProvider.tsx
    profileRepo.test.ts
    profileRepo.ts
    recordRepo.test.ts
    recordRepo.ts
    storage.test.ts
    storage.ts
    useCheckupStore.ts
  domain/
    banner.test.ts
    banner.ts
    checkup.test.ts
    checkup.ts
    format.test.ts
    format.ts
    plan.test.ts
    plan.ts
    rules.test.ts
    rules.ts
  hooks/
  index.css
  lib/
    analytics.ts
    contract.ts
    review.ts
    share.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  test/
    renderWithProviders.tsx
  types/
  vite-env.d.ts

### Exports (src/lib/)
- analytics.ts: export type LogFields = Record<string, string | number | boolean | null>; export const DWELL_MS = 3000; export function fireAndForget(call: () => unknown): void; export function logScreen(page: string, extra?: LogFields): void; export function logClick(name: string, extra?: LogFields): void; export function logImpression(name: string, extra?: LogFields): void; export function useScreenLog(page: string): void
- contract.ts: export type newIdFn = () => string; export type resetAllFn = () =>; export type invalidFamilyLineFn = (name: string) => string
- review.ts: export function requestReviewOnce(key: string = REVIEW_REQUESTED_KEY): void
- share.ts: export interface ShareAppOptions; export async function shareApp(opts: ShareAppOptions): Promise<void>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type Sex = 'male' | 'female'; export type InsuranceType = | 'employee_office' | 'employee_nonoffice' | 'regional_head' | 'dependent' | 'medical_aid'; export type CheckupItemId = | 'general' | 'stomach' | 'colorectal' | 'breast' | 'cervical' | 'liver' | 'lung'; export interface CheckupRule; export interface Profile; export interface CheckupRecord; export interface BannerState; export interface ItemStatus
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- home/CheckupItemRow.tsx: CheckupItemRow
- home/DeadlineBanner.tsx: DeadlineBanner
- home/FreeTier.tsx: FreeTier
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: TypeScript 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: 스캐폴드 CSS 정리 + 검수 기준선 + .env.example (files: src/index.css, src/App.css, docs/qa/compliance-baseline.md, .env.example)
- 0003: 검진 기준 상수(rules) + 판정 엔진 evaluateProfile·daysUntilYearEnd (files: src/domain/rules.ts, src/domain/rules.test.ts, src/domain/checkup.ts, src/domain/checkup.test.ts)
- 0004: 판정 엔진 — buildPlan·evaluateAll·계획표/가족 문구 (files: src/domain/plan.ts, src/domain/plan.test.ts)
- 0005: 표시 문구·canToggle·마감 배너 판정 (순수 함수) (files: src/domain/format.ts, src/domain/banner.ts, src/domain/format.test.ts, src/domain/banner.test.ts)
- 0006: localStorage 원시 함수 + 읽기 검증기 + newId (files: src/data/storage.ts, src/data/storage.test.ts)
- 0007: 프로필 CRUD — profileRepo (files: src/data/profileRepo.ts, src/data/profileRepo.test.ts)
- 0008: 수검 기록 토글·배너 닫기·전체 초기화 — recordRepo (files: src/data/recordRepo.ts, src/data/recordRepo.test.ts)
- 0009: 상태 관리 — CheckupStoreProvider·useCheckupStore (files: src/data/CheckupStoreProvider.tsx, src/data/useCheckupStore.ts, src/data/CheckupStoreProvider.test.tsx, src/test/renderWithProviders.tsx)
- 0013: 검진 항목 행 — CheckupItemRow (Switch·조건부 시트) (files: src/components/home/CheckupItemRow.tsx, src/components/home/CheckupItemRow.test.tsx)
- 0014: 무료 층 — FreeTier (히어로·체크리스트·빈 상태·고지·공유) (files: src/components/home/FreeTier.tsx, src/components/home/FreeTier.test.tsx)
- 0015: 하반기 마감 배너 — DeadlineBanner (files: src/components/home/DeadlineBanner.tsx, src/components/home/DeadlineBanner.test.tsx)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/components/home/CheckupItemRow.tsx
export default function CheckupItemRow({ profileId, status, year, eligibleCount }: CheckupItemRowProps) {

// src/components/home/DeadlineBanner.tsx
export default function DeadlineBanner({ result, today }: DeadlineBannerProps) {

// src/components/home/FreeTier.tsx
export default function FreeTier({ result, profileId }: FreeTierProps) {

// src/data/CheckupStoreProvider.tsx
export function CheckupStoreProvider({ children }: { children: ReactNode }) {

// src/data/profileRepo.ts
export interface ProfileSnapshot {
export type ProfileInput = Omit<Profile, "id" | "createdAt" | "updatedAt">;
export type ProfilePatch = Partial<ProfileInput>;
export interface RepoResult {
export function addProfile(snapshot: ProfileSnapshot, input: ProfileInput, now: string): RepoResult {
export function updateProfile(
export function deleteProfi

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(4), general(14), testing(2), ui(3)

Key lessons (verify against actual code before applying):
- [general] 진입점 라우터 배선은 맨 끝에 두지 말고 기반 패킷 직후 플레이스홀더 페이지와 함께 먼저 병합하라. 화면 패킷은 그 플레이스홀더를 교체하게 해서, 언제 중단돼도 병합된 화면에 도달할 수 있게 하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 파일 생성 전 디렉토리 구조 확인 — mkdir -p로 경로 보장 (60% · 타 앱 1회 — 맹신 금지)
- [general] 화면·라우팅 등 소비자 모듈은 그것이 import하는 생산자 모듈이 병합된 뒤에만 병합하고, 순서를 지킬 수 없으면 소비자 병합과 동시에 최소 플레이스홀더를 만들어 매 병합 직후 타입체크와 빌드가 항상 통과하도록 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 전역 라우팅·탭바·Provider 배선은 개별 화면보다 먼저(초반 20% 안에) 완료하고 미구현 화면은 스텁 라우트로 연결해, 시간 예산이 소진돼도 앱이 항상 실행 가능한 상태를 유지하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)