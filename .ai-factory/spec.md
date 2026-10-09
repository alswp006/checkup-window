# SPEC — Checkup Window
앱 이름: 올해검진 / Checkup Window

## Value Contract
- 결과: 이 앱을 쓰고 나면 사용자는 올해 받아야 할 국가 건강검진 항목과 연말 마감까지 남은 날을 안다.
- 바뀌는 행동: 올해 대상 항목이 있으면 12월 31일 전에 검진 예약을 잡는다. 대상이 아니면 미루고, 다음 대상 연도에 다시 연다.
- 매번 얻는 결과물: 올해 대상 항목 체크리스트(예: 일반건강검진·위암 검진), 12월 31일까지의 D-day(예: D-82), 항목별 다음 대상 연도(예: 2028년).
- 앱이 더하는 것: 사용자가 직접 찾아 맞춰 보기 어려운 공개 기준을 규칙으로 적용해 올해 대상 여부와 다음 대상 연도를 계산한다. 적용하는 기준은 세 가지다.
  - 출생연도 짝·홀수 격년 기준(국민건강보험공단 건강검진 안내·「건강검진 실시기준」 보건복지부 고시)
  - 비사무직 직장가입자 매년 검진(국민건강보험법 시행령 제25조)
  - 암종별 연령·성별·주기 기준(암관리법 시행령 별표 1)
- 앱 없이: 공단 'The건강보험' 앱을 설치하고 본인인증을 거쳐 조회한다(약 5분). 가족은 본인이 각자 해야 한다. 아니면 공단 홈페이지의 기준표를 읽고 계산기로 직접 계산한다(약 10분).
- Value AC: F4-AC-1

## Common Principles
- 기술 스택: Vite + React + TypeScript, `@toss/tds-mobile`(모든 UI), `react-router-dom`(클라이언트 라우팅), localStorage(저장). 서버 코드와 외부 API는 없다.
- 앱 제목: 모든 화면의 Top title은 "올해검진"이다. 영문 이름·slug는 화면에 쓰지 않는다. 화면별 부제목도 한국어로 쓴다.
- TDS 사용 규칙
  - ListRow, Button, TextField, Paragraph.Text, Chip+ChipItem, Switch, AlertDialog, BottomSheet, Toast, Top, Badge, Asset.ContentIcon을 블록처럼 조립한다.
  - 간격은 `Spacing size={…}`만 쓴다. TDS 컴포넌트의 padding·margin을 덮어쓰지 않는다.
  - 커스텀 CSS는 flex·grid 배치에만 쓴다.
  - shadcn/ui·MUI·Ant Design·Chakra UI는 쓰지 않는다.
- 템플릿 컴포넌트는 재설계하지 않고 그대로 쓴다: ScreenScaffold/PageShell, SubmitFooter, Card, SummaryHero(CountUp), MiniBar, AdSlot, TossRewardAd, 로그 유틸(logClick, logImpression), shareApp, requestReviewOnce.
- 색상: HEX 하드코딩(`#FFFFFF`, `#333` 등)은 쓰지 않는다. `var(--adaptiveGrey600)` 같은 `var(--adaptive*)` 변수나 TDS 컴포넌트 색만 쓴다. 다크모드를 지원해야 한다.
- 호환성: Android 7+, iOS 16+. `crypto.randomUUID`, `structuredClone`, `Array.prototype.at`, `Object.hasOwn`은 쓰지 않는다. ID는 `Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)`로 만든다.
- 날짜 판정
  - 모든 판정 함수는 `today: Date`를 인자로 받는다. 화면은 `new Date()`(기기 로컬 시간)를 넘긴다.
  - 테스트는 `vi.setSystemTime`으로 오늘을 고정한다. 이 SPEC의 예시 값은 모두 오늘 = 2026-10-10 기준이다.
- 나이 기준: 검진 판정 나이는 `검진연도 − 출생연도`(연 나이)다. 공단은 생일이 아니라 출생연도로 대상자를 정한다. 이 해석은 Open Questions에서 확인한다.
- 의료 정보 범위: 앱은 공개 기준에 따른 대상 여부만 알려 준다. 증상 판단, 검진 기관 추천, 추가 검사 권유 같은 의료 조언은 하지 않는다. 결과 화면에는 고지 문구를 항상 표시한다.
- 외부 의존 금지
  - 외부 URL 이동(`window.open`, 외부 `location.href`)을 하지 않는다.
  - 외부 분석 솔루션(GA·Amplitude 등)을 쓰지 않는다.
  - 앱 설치를 유도하는 문구를 쓰지 않는다.
- 프로모션 리워드(`grantPromotionReward`)는 이번 MVP에서 쓰지 않는다. 나중에 도입하면 amount ≤ 5,000을 검증한다.
- 생성형 AI 기능이 없으므로 AI 고지 의무는 해당하지 않는다.

## Data Models

### 닫힌 집합(법정 기준 — 사용자 맞춤 규칙의 예외)
아래 세 유니온은 법령·고시가 정한 범주다. 사용자가 추가·삭제할 대상이 아니다.
```ts
export type Sex = 'male' | 'female'; // 암관리법 시행령 별표1 성별 기준(유방암·자궁경부암)
export type InsuranceType =
  | 'employee_office'     // 직장가입자(사무직)
  | 'employee_nonoffice'  // 직장가입자(비사무직) — 매년
  | 'regional_head'       // 지역가입자 세대주
  | 'dependent'           // 직장 피부양자·지역 세대원(만 20세 이상)
  | 'medical_aid';        // 의료급여수급권자(만 19~64세)
export type CheckupItemId =
  | 'general' | 'stomach' | 'colorectal' | 'breast' | 'cervical' | 'liver' | 'lung';
```

### CheckupRule — 코드 상수(저장하지 않음)
```ts
export interface CheckupRule {
  id: CheckupItemId;
  label: string;            // "일반건강검진", "위암 검진" …
  cycle: 'annual' | 'biennial';
  minAge: number | null;
  maxAge: number | null;
  sex: Sex | null;          // null = 성별 무관
  conditional: boolean;     // 고위험군 조건부 항목
  conditionText: string | null;
  source: string;           // 출처 문구(화면 표시용, 링크 아님)
}
```
| id | label | 주기 | 연령 | 성별 | 조건부 | 출처 |
|---|---|---|---|---|---|---|
| general | 일반건강검진 | 격년(비사무직 매년) | 가입유형별(아래) | - | 아니오 | 국민건강보험법 제52조·시행령 제25조, 건강검진 실시기준 |
| stomach | 위암 검진 | 격년 | 40~ | - | 아니오 | 암관리법 시행령 별표1 |
| colorectal | 대장암 검진 | 매년 | 50~ | - | 아니오 | 암관리법 시행령 별표1 |
| breast | 유방암 검진 | 격년 | 40~ | female | 아니오 | 암관리법 시행령 별표1 |
| cervical | 자궁경부암 검진 | 격년 | 20~ | female | 아니오 | 암관리법 시행령 별표1 |
| liver | 간암 검진 | 매년 표시(실제 6개월 주기) | 40~ | - | 예 — "간경변증, B형간염 항원 양성, C형간염 항체 양성, B형·C형 간염 바이러스에 의한 만성 간질환자" | 암관리법 시행령 별표1 |
| lung | 폐암 검진 | 격년 | 54~74 | - | 예 — "30갑년 이상 흡연력을 가진 흡연자" | 암관리법 시행령 별표1 |

일반건강검진의 가입유형별 규칙은 다음과 같다.
- `employee_nonoffice`: 매년. 연령 제한 없음.
- `employee_office`, `regional_head`: 격년. 연령 제한 없음.
- `dependent`: 격년, 만 20세 이상.
- `medical_aid`: 격년, 만 19~64세.

격년 항목은 `birthYear % 2 === year % 2`일 때만 대상이다.

### Profile
```ts
export interface Profile {
  id: string;
  name: string;            // 1~10자, 프로필 간 중복 불가. 본인 기본값 "나"
  role: 'self' | 'family'; // 역할 필드 — 'self'는 정확히 1개
  birthYear: number;       // 1920 ≤ birthYear ≤ 올해
  sex: Sex;
  insuranceType: InsuranceType;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
}
```
- localStorage key `checkupWindow.profiles.v1`, 값 `{ version: 1, data: Profile[] }`
- 제약: 최대 10개(본인 1 + 가족 9)
- 크기: 약 220B × 10 ≈ 2.2KB

### CheckupRecord(수검 체크)
```ts
export interface CheckupRecord {
  profileId: string;
  itemId: CheckupItemId;
  year: number;            // 수검 연도
  receivedAt: string;      // ISO
}
```
- localStorage key `checkupWindow.records.v1`, 값 `{ version: 1, data: CheckupRecord[] }`
- 제약: (profileId, itemId, year) 조합은 유일하다. 저장할 때 `year < 올해 − 5`인 기록은 지운다.
- 크기: 약 120B × 10프로필 × 7항목 × 6년 ≈ 50KB

### BannerState
```ts
export interface BannerState { dismissedMonth: string | null } // 'YYYY-MM'
```
- localStorage key `checkupWindow.banner.v1`
- 크기: 50B 미만

### 계산 결과(저장하지 않음)
```ts
export interface ItemStatus {
  itemId: CheckupItemId;
  label: string;
  eligibleThisYear: boolean;
  conditional: boolean;
  received: boolean;          // 올해 기록 존재
  nextYear: number | null;    // 다음 대상 연도(올해 대상·미수검이면 올해). 영구 비대상이면 null
  reason: string;             // 예: "2027년 대상(홀수년 출생)", "대상 연령(19~64세)이 아니에요"
}
export interface ProfileResult {
  profileId: string;
  year: number;
  age: number;
  items: ItemStatus[];        // CheckupRule 순서 고정. 영구 비대상(성별 불일치)은 제외
  eligibleCount: number;      // 조건부 제외, 올해 대상 수
  receivedCount: number;      // 조건부 제외, 올해 대상 중 수검 수
  daysLeft: number;           // 12/31까지 일수(12/31 당일 0)
  nextCheckupYear: number | null; // 조건부 제외 항목 중 가장 이른 미래 대상 연도
}
export type HomeLocationState = { toast: 'saved' | 'deleted' } | null;
export type ProfileFormLocationState = { mode: 'self' | 'family' } | null;
```
저장 데이터 합계는 60KB 미만이다(5MB 한도의 1.2% 미만).

## Screen Definitions

### S1. 홈(결과) — `/`
- 골격: `ScreenScaffold`. Top title은 "올해검진".
- 구성(위에서 아래 순서)
  1. 마감 배너(F6): `Card` + `Badge` + `Paragraph.Text`, `data-testid="deadline-banner"`. 조건을 만족할 때만 표시한다.
  2. 무료 층 `data-testid="free-tier"`(`<TossRewardAd>` 바깥)
     - `SummaryHero`(`data-testid="summary-hero"`): CountUp 값 "올해 대상 N개", 보조값 "D-82", `MiniBar`로 수검 진행률(receivedCount/eligibleCount).
     - `Card` 안에 항목별 `ListRow`(`data-testid="checkup-item-{itemId}"`). 우측에 TDS `Switch`("받았어요")를 두고, 아래 설명에 다음 대상 연도를 쓴다. 조건부 항목은 `Badge` "조건부"를 붙인다.
     - 고지 `Paragraph.Text`: "정확한 대상 여부는 국민건강보험공단 안내를 확인하세요".
     - `Button` "결과 공유하기"(display="block").
  3. `AdSlot`(배너): 무료 층과 가족 영역 사이. 콘텐츠와 겹치지 않는다.
  4. 가족 티저 `ListRow`(게이트 바깥): "등록한 가족: 엄마 · 아빠" 또는 "가족을 추가해 함께 확인해요".
  5. `<TossRewardAd>` 자식 `data-testid="locked-tier"`: 3개년 계획표 `Card` 3장(`data-testid="plan-year-{연도}"`), 가족별 올해 결과 `ListRow`, `Button` "가족 추가".
  6. 하단 `ListRow` 3개: "내 정보 수정", "검진 기준과 출처", "데이터 초기화".
- 결과 계층화
  - 무료 층: 본인의 올해 대상 체크리스트, D-day, 다음 대상 연도. 이것만으로 앱의 목적이 달성된다.
  - 잠금 층: 가족 각자의 결과와 향후 3개년(올해~+2년) 계획표.
  - 코드 구조 규칙: 무료 층은 `<TossRewardAd>` 바깥에 두고, 잠금 층만 그 자식으로 둔다. 화면 전체를 감싸지 않는다.
- 상태
  - 로딩: 프로필을 읽기 전에는 TDS Loader 1개만 표시한다.
  - 빈 상태: 올해 대상이 0개면 `Asset.ContentIcon`과 "올해는 받을 국가검진이 없어요"를 표시한다.
  - 에러: 저장 실패와 손상 데이터는 `Toast`로 알린다.
- 시트: 조건부 항목 설명, 가족 체크리스트, 기준 출처는 `BottomSheet`로, 초기화·삭제 확인은 `AlertDialog`로 연다. 새 라우트는 만들지 않는다.
- 터치: 모든 ListRow·Switch·Button의 터치 영역은 44px 이상이다.
- 스크롤: 일반 문서 스크롤. 항목은 최대 7개, 프로필은 최대 10개라 가상 스크롤은 쓰지 않는다.
- 네비게이션 계약
  - Incoming: `location.state: HomeLocationState`
  - 본인 프로필이 없으면 `navigate('/profile/new', { replace: true, state: { mode: 'self' } satisfies ProfileFormLocationState })`
  - "가족 추가" → `navigate('/profile/new', { state: { mode: 'family' } })`
  - "내 정보 수정"·가족 시트의 "정보 수정" → `navigate('/profile/' + profileId + '/edit')`. state 없음, URL param만 사용.
  - 초기화 완료 → `navigate('/profile/new', { replace: true, state: { mode: 'self' } })`
- 계측
  - `logImpression('result_free_tier')`: 무료 층 첫 렌더
  - `logImpression('deadline_banner')`: 배너 노출
  - `logImpression('reward_locked_tier')`: 잠금 층 렌더
  - `logClick('checkup_received_toggle')`: Switch
  - `logClick('family_add')`: 가족 추가
  - `logClick('share_result')`: 공유
  - `requestReviewOnce()`: 첫 수검 체크 ON 직후 1회
  - 화면 진입·체류 로그는 PageShell이 자동으로 남긴다.

### S2. 프로필 입력·수정 — `/profile/new`, `/profile/:profileId/edit`
- 골격: `ScreenScaffold`. Top title은 "올해검진", 부제목 `Paragraph.Text`는 모드에 따라 다르다.
  - 본인 신규: "내 정보 입력"
  - 가족 신규: "가족 추가"
  - 수정: "정보 수정"
- 구성
  - `TextField` "이름"(본인 신규면 "나"가 미리 채워짐, maxLength 10)
  - `TextField` "출생연도"(inputMode="numeric", maxLength 4, placeholder "예: 1990")
  - `Chip`+`ChipItem` "남성"/"여성"
  - 가입 유형 `ListRow` 5개(단일 선택, 선택 시 우측 체크 표시, 설명 1줄)
  - `SubmitFooter` 하단 고정 버튼: 신규면 "결과 보기", 수정이면 "저장"
  - 수정 모드의 가족 프로필에만 `Button` "삭제"(type danger)를 둔다.
- 키보드: 출생연도 입력 중 Enter를 누르면 blur된다. SubmitFooter는 키보드 위에 고정된다. 템플릿 SubmitFooter의 기본 동작을 따른다.
- 상태: 수정 모드에서 프로필을 읽는 동안은 Loader를 표시한다. 없는 id면 홈으로 replace 이동한다.
- 네비게이션 계약
  - Incoming: `location.state: ProfileFormLocationState`. null이면 본인 프로필이 있을 때 'family', 없을 때 'self'로 본다. 수정 모드는 `useParams().profileId: string`을 쓴다.
  - 저장 성공 → `navigate('/', { replace: true, state: { toast: 'saved' } satisfies HomeLocationState })`
  - 삭제 성공 → `navigate('/', { replace: true, state: { toast: 'deleted' } })`
- 계측: `logClick('profile_submit')`(SubmitFooter 버튼), `logClick('profile_delete')`

## Feature List

### F1. 검진 대상 판정 엔진 (순수 함수)
- Description: Profile·CheckupRecord·today를 받아 올해 항목별 대상 여부, 다음 대상 연도, 12월 31일까지 남은 일수, 3개년 계획을 계산하는 순수 함수 모음이다(`src/domain/checkup.ts`). UI와 저장소에 의존하지 않는다. 기준값은 CheckupRule 상수 한 곳에만 둔다.
- Data: CheckupRule(상수), Profile, CheckupRecord, ItemStatus, ProfileResult
- API: 없음(외부 API 미사용). 내부 함수는 `evaluateProfile(profile, records, today): ProfileResult`, `buildPlan(profile, records, today, years = 3): { year: number; items: ItemStatus[] }[]`, `daysUntilYearEnd(today): number`.
- Requirements:
- AC-1 [U][P0]: Scenario: 격년 일반검진 짝·홀수 판정
  - Given today = 2026-10-10
  - When `evaluateProfile({ birthYear: 1986, sex: 'male', insuranceType: 'employee_office' }, [], today)`를 실행하면
  - Then general은 `{ eligibleThisYear: true, nextYear: 2026 }`, stomach는 `{ eligibleThisYear: true, nextYear: 2026 }`, liver는 `{ eligibleThisYear: true, conditional: true }`, colorectal은 `{ eligibleThisYear: false, nextYear: 2036 }`이다.
  - And eligibleCount = 2, age = 40이고, items에 breast·cervical은 없다.
- AC-2 [U][P0]: Scenario: 비사무직 매년 / 홀수년 출생 비대상
  - Given today = 2026-10-10
  - When birthYear 1987·male·`employee_nonoffice`를 평가하면 general은 `eligibleThisYear: true`다.
  - And 같은 출생연도를 `employee_office`로 평가하면 general은 `{ eligibleThisYear: false, nextYear: 2027, reason: "2027년 대상(홀수년 출생)" }`이다.
- AC-3 [U][P0]: Scenario: 암검진 연령·성별 기준
  - Given today = 2026-10-10
  - When birthYear 1966·female·`dependent`를 평가하면
  - Then general, stomach, colorectal, breast, cervical이 모두 eligibleThisYear: true이고 liver·lung은 조건부 대상이다.
  - And eligibleCount = 5다.
- AC-4 [U][P0]: Scenario: 수검 후 다음 대상 연도
  - Given 1986·male·office 프로필에 `{ itemId: 'general', year: 2026 }` 기록이 있고, 1990·male·`employee_nonoffice` 프로필에 `{ itemId: 'general', year: 2026 }` 기록이 있을 때
  - When 각각 평가하면
  - Then 1986 프로필의 general은 `{ received: true, nextYear: 2028 }`, 1990 프로필의 general은 `{ received: true, nextYear: 2027 }`이다.
  - And 1986 프로필에서 general·stomach가 모두 수검이면 nextCheckupYear = 2028이다(조건부 liver 제외).
- AC-5 [U][P0]: Scenario: 연말 D-day 계산
  - When `daysUntilYearEnd(new Date(2026, 9, 10))`이면 82, `new Date(2026, 11, 1)`이면 30, `new Date(2026, 11, 31, 23, 59)`이면 0이다.
- AC-6 [W][P1]: Scenario: 연령 상한·하한 비대상
  - Given today = 2026-10-10
  - When birthYear 1960·`medical_aid`를 평가하면 general은 `{ eligibleThisYear: false, nextYear: null, reason: "대상 연령(19~64세)이 아니에요" }`다.
  - And birthYear 1950이면 lung은 nextYear: null이다.
  - And birthYear 2008·female·`dependent`이면 general·cervical 모두 nextYear: 2028이다.
- AC-7 [W][P1]: Scenario: 잘못된 출생연도 거부
  - When birthYear가 1919 또는 2027(today 2026년)이면
  - Then `evaluateProfile`은 `RangeError('INVALID_BIRTH_YEAR')`를 던지고 결과를 반환하지 않는다.
- AC-8 [E][P1]: Scenario: 3개년 계획과 빈 입력
  - When 1986·male·office로 `buildPlan(profile, [], today)`를 실행하면
  - Then 연도 [2026, 2027, 2028]이 반환된다.
  - And 2027의 비조건부 대상은 0개, 2028은 general·stomach다.
  - And `profiles = []`로 전체 평가를 실행하면 빈 배열 `[]`을 반환하고 예외가 없다.

### F2. 프로필·수검 기록 저장소
- Description: Profile·CheckupRecord·BannerState를 localStorage에 읽고 쓰는 저장소(`src/data/store.ts`)와 React 훅(`useCheckupStore`)이다. 쓰기는 모두 `{ ok: true } | { ok: false; error: 'STORAGE_FULL' | 'FAMILY_LIMIT' | 'DUPLICATE_NAME' | 'SELF_EXISTS' }`를 반환한다. 실패해도 기존 데이터는 그대로 둔다.
- Data: Profile, CheckupRecord, BannerState
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 본인 프로필 저장
  - Given localStorage가 비어 있을 때
  - When `addProfile({ name: '나', role: 'self', birthYear: 1986, sex: 'male', insuranceType: 'employee_office' })`를 호출하면
  - Then `checkupWindow.profiles.v1`에 `{ version: 1, data: [ { …, id: <비어있지 않은 문자열>, createdAt, updatedAt } ] }`가 저장되고 `{ ok: true }`를 반환한다.
- AC-2 [E][P0]: Scenario: 수검 기록 토글
  - When `toggleRecord(profileId, 'general', 2026)`을 1회 호출하면 records에 1건이 추가된다.
  - And 같은 인자로 다시 호출하면 그 1건이 삭제되어 0건이 된다.
- AC-3 [W][P0]: Scenario: 본인 프로필 중복 방지
  - Given role 'self' 프로필이 이미 있을 때
  - When role 'self'로 `addProfile`을 호출하면
  - Then `{ ok: false, error: 'SELF_EXISTS' }`를 반환하고 profiles 길이는 1로 남는다.
- AC-4 [W][P1]: Scenario: 손상된 데이터 복구
  - Given `checkupWindow.profiles.v1` 값이 `"{oops"`일 때
  - When 저장소를 초기화하면
  - Then profiles는 `[]`이고 원본 문자열은 `checkupWindow.profiles.v1.corrupt`에 보관되며 `recovered: true` 플래그가 반환된다.
  - And 홈은 Toast "저장된 정보를 불러오지 못해 새로 시작해요"를 1회 표시한다.
- AC-5 [W][P1]: Scenario: 저장 공간 부족
  - Given `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  - When `addProfile`을 호출하면
  - Then `{ ok: false, error: 'STORAGE_FULL' }`을 반환하고 메모리·스토리지의 기존 profiles는 변하지 않는다.
- AC-6 [W][P1]: Scenario: 가족 수 한도와 이름 중복
  - Given 가족 9명이 있으면 10번째 family 추가는 `{ ok: false, error: 'FAMILY_LIMIT' }`다.
  - And 이름 "엄마"가 있을 때 "엄마"를 또 추가하면 `{ ok: false, error: 'DUPLICATE_NAME' }`이다.
- AC-7 [S][P1]: Scenario: 로딩 상태와 빈 상태
  - While 첫 읽기가 끝나기 전, `useCheckupStore().status`는 'loading'이다.
  - Then 읽기가 끝나면 'ready'가 되고, 저장값이 없으면 `profiles = []`, `records = []`다.
- AC-8 [E][P1]: Scenario: 프로필 삭제 시 기록 연쇄 삭제
  - Given 가족 "엄마"에 records 3건이 있을 때
  - When `deleteProfile(엄마.id)`를 호출하면
  - Then 해당 profileId의 records는 0건이 되고 다른 프로필의 records 수는 변하지 않는다.

### F3. 프로필 입력 화면 (본인·가족 공용)
- Description: 출생연도·성별·가입 유형을 한 번 입력하는 폼이다(S2). 본인 첫 입력, 가족 추가, 수정에 같은 컴포넌트를 쓰고 모드는 location.state와 URL param으로 정한다. 저장하면 홈 결과로 이동한다.
- Data: Profile(F2 저장소)
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 첫 입력 후 결과 이동
  - Given 프로필이 없어 `/profile/new`(state `{ mode: 'self' }`)에 있을 때
  - When 이름 "나", 출생연도 "1986", "남성", "직장가입자(사무직)"를 선택하고 "결과 보기"를 탭하면
  - Then role 'self' 프로필이 저장되고 `navigate('/', { replace: true, state: { toast: 'saved' } })`가 호출된다.
  - And `logClick('profile_submit')`이 1회 기록된다.
- AC-2 [W][P1]: Scenario: 출생연도 형식·범위 오류
  - When 출생연도를 "198"로 제출하면 TextField 아래에 "출생연도 4자리를 입력해주세요"가 표시된다.
  - And "1919" 또는 "2027"(올해 2026)이면 "1920~2026년 사이로 입력해주세요"가 표시되고, 저장도 이동도 하지 않는다.
- AC-3 [W][P1]: Scenario: 선택 누락
  - When 성별 없이 제출하면 "성별을 선택해주세요"가, 가입 유형 없이 제출하면 "가입 유형을 선택해주세요"가 표시된다.
- AC-4 [W][P1]: Scenario: 이름 오류
  - When 이름이 빈 값이면 "이름을 입력해주세요"가 표시된다.
  - And "엄마"가 이미 있을 때 가족 이름을 "엄마"로 제출하면 "이미 같은 이름의 프로필이 있어요"가 표시된다.
  - And 가족이 9명일 때 `/profile/new`에 들어오면 SubmitFooter 버튼이 비활성화되고 "가족은 최대 9명까지 추가할 수 있어요"가 표시된다.
- AC-5 [U][P1]: Scenario: 숫자 키보드와 입력 정리
  - The system shall render 출생연도 TextField with inputMode="numeric" and maxLength=4.
  - When "19a8"을 입력하면 값은 즉시 "198"이 된다.
  - When Enter를 누르면 TextField가 blur된다.
- AC-6 [E][P1]: Scenario: 수정 모드 프리필과 잘못된 id
  - When `/profile/{엄마.id}/edit`에 진입하면 이름 "엄마", 출생연도 "1966", "여성", 선택된 가입 유형이 미리 채워진다.
  - And 존재하지 않는 id면 `navigate('/', { replace: true })`가 호출된다.
  - And 읽는 동안에는 Loader만 보인다.
- AC-7 [W][P1]: Scenario: 저장 실패
  - Given 저장소가 `STORAGE_FULL`을 반환할 때
  - When 제출하면
  - Then Toast "저장 공간이 부족해 저장하지 못했어요"가 표시되고 화면에 남으며 입력값은 유지된다.
- AC-8 [U][P2]: Scenario: 가입 유형 설명과 터치 영역
  - The system shall render 5개 가입 유형 ListRow, 각 높이 ≥ 44px.
  - 설명은 다음과 같다.
    - "직장가입자(비사무직)": "매년 검진 대상이에요"
    - "피부양자·세대원": "만 20세 이상부터 대상이에요"
    - "의료급여수급권자": "만 19~64세가 대상이에요"

### F4. 홈 결과 화면 — 무료 층
- Description: 본인 프로필의 올해 대상 체크리스트, 12월 31일까지 D-day, 항목별 다음 대상 연도를 보여 주는 핵심 화면이다(S1). 광고 상태와 무관하게 항상 보인다. 검수 필수 조건도 이 화면에서 확인한다.
- Data: Profile, CheckupRecord, ProfileResult(F1)
- API: 없음
- Requirements:
- AC-1 [E][P0]: Given 오늘이 2026-10-10이고 내 프로필이 { birthYear: 1986, sex: "male", insuranceType: "employee_office" }일 때 When 홈(/)에 진입하면 Then data-testid="free-tier"에 "일반건강검진"·"위암 검진" 대상 행 2개와 Badge "조건부"가 붙은 "간암 검진" 행 1개, "올해 대상 2개", "D-82"가 표시된다
- AC-2 [U][P0]: Scenario: 결과 화면 레이아웃
  - Given AC-1과 같은 프로필일 때
  - Then 화면은 ScreenScaffold로 감싸지고 Top title은 "올해검진"이다.
  - And `data-testid="summary-hero"` 안에 CountUp 값 2와 "D-82", MiniBar(0/2)가 있다.
  - And 항목 행은 Card 안의 `data-testid="checkup-item-general"`, `"checkup-item-stomach"`, `"checkup-item-liver"`다.
  - And 대상이 아닌 colorectal 행 설명은 "다음 대상 2036년"이다.
- AC-3 [S][P1]: Scenario: 올해 대상 없음
  - Given 프로필이 { birthYear: 1987, sex: 'female', insuranceType: 'regional_head' }일 때
  - Then free-tier에 Asset.ContentIcon, "올해는 받을 국가검진이 없어요", "다음 대상: 2027년"이 표시된다.
  - And Switch는 0개, D-day 문구는 표시되지 않는다.
- AC-4 [S][P1]: Scenario: 로딩 중
  - While store status가 'loading'이면 Loader만 표시한다.
  - And `/profile/new`로 이동하지 않고 summary-hero도 렌더하지 않는다.
- AC-5 [E][P0]: Scenario: 본인 프로필 없음
  - Given status 'ready'이고 role 'self' 프로필이 없을 때
  - When `/`에 진입하면
  - Then `navigate('/profile/new', { replace: true, state: { mode: 'self' } })`가 호출된다.
- AC-6 [E][P1]: Scenario: 저장·삭제 후 토스트
  - When location.state가 `{ toast: 'saved' }`로 진입하면 Toast "저장했어요"가, `{ toast: 'deleted' }`면 "삭제했어요"가 1회 표시된다.
  - And 이후 `navigate('.', { replace: true, state: null })`로 state를 비워 새로고침해도 다시 뜨지 않는다.
- AC-7 [E][P1]: Scenario: 조건부 항목 설명과 고지
  - When "간암 검진" 행의 Badge 영역을 탭하면 BottomSheet에 "간경변증, B형간염 항원 양성, C형간염 항체 양성, B형·C형 간염 바이러스에 의한 만성 간질환자"와 "출처: 암관리법 시행령 별표1"이 표시된다.
  - And free-tier 하단에는 항상 "정확한 대상 여부는 국민건강보험공단 안내를 확인하세요"가 표시된다.
- AC-8 [W][P1]: Scenario: 검수 필수 조건
  - The system shall never contain HEX 색상 리터럴(`/#[0-9a-fA-F]{3,8}\b/`) in `src/**/*.{ts,tsx,css}`.
  - The system shall never import 외부 분석 SDK(`react-ga`, `@amplitude/*` 등).
  - And 프로덕션 빌드에서 홈 렌더 시 console.error 호출 수는 0이다.

### F5. 수검 체크 & 다음 대상 연도 안내
- Description: 올해 대상 항목을 "받았어요" Switch로 체크하면 기록을 저장한다. 그 항목에는 다음 대상 연도를, 히어로에는 진행률과 다음 검진 연도를 바로 보여 준다. 결과가 나온 뒤에는 공유와 리뷰 요청이 붙는다.
- Data: CheckupRecord, ProfileResult
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 일반검진 체크
  - Given 1986·male·office 프로필, today 2026-10-10일 때
  - When `checkup-item-general`의 Switch를 ON하면
  - Then records에 `{ itemId: 'general', year: 2026 }`이 저장된다.
  - And 행 설명이 "받았어요 · 다음 대상 2028년"으로 바뀌고 MiniBar는 1/2(50%)다.
  - And `logClick('checkup_received_toggle')`이 1회 기록된다.
- AC-2 [E][P0]: Scenario: 올해 검진 완료
  - When general과 stomach를 모두 ON하면
  - Then summary-hero 문구가 "올해 검진 완료 · 다음 검진 2028년"으로 바뀐다(조건부 간암은 계산에서 제외).
- AC-3 [E][P1]: Scenario: 체크 해제
  - When ON 상태인 general Switch를 OFF하면
  - Then 해당 record가 삭제되고 행 설명은 "올해 대상 · 12월 31일까지", MiniBar는 0/2로 돌아간다.
- AC-4 [W][P1]: Scenario: 저장 실패 시 롤백
  - Given `toggleRecord`가 `{ ok: false, error: 'STORAGE_FULL' }`을 반환할 때
  - When Switch를 탭하면
  - Then Switch는 이전 상태로 돌아가고 Toast "저장하지 못했어요. 다시 시도해주세요"가 표시된다.
- AC-5 [S][P1]: Scenario: 비대상 항목은 체크 불가
  - While 항목이 eligibleThisYear: false이면 그 행에는 Switch가 렌더되지 않고 "다음 대상 {연도}년" 또는 사유 문구만 보인다.
  - Then 대상 0개인 프로필의 Switch 수는 0이다.
- AC-6 [E][P1]: Scenario: 첫 체크 후 리뷰 요청
  - When 앱 설치 후 처음으로 Switch를 ON하면 `requestReviewOnce()`가 1회 호출된다.
  - And 이후 ON·OFF를 반복해도 추가로 호출되지 않는다(템플릿 1회 보장 사용).
- AC-7 [E][P2]: Scenario: 결과 공유
  - When "결과 공유하기" Button을 탭하면 `shareApp()`이 1회 호출되고 `logClick('share_result')`가 기록된다.
- AC-8 [S][P1]: Scenario: 지난해 기록은 올해에 넣지 않음
  - Given 1985·male·office 프로필에 `{ general, year: 2025 }` 기록이 있고 today가 2026-10-10일 때
  - Then general은 eligibleThisYear: false, nextYear: 2027이다.
  - And 올해 receivedCount는 0이다.

### F6. 하반기 접수 마감 임박 배너
- Description: 7월 1일부터 12월 31일까지, 본인에게 올해 대상인데 아직 체크하지 않은 항목이 있으면 홈 최상단에 마감 배너를 띄운다. 30일 이내에는 문구를 바꾼다. 닫으면 그달에는 다시 띄우지 않는다.
- Data: BannerState, ProfileResult
- API: 없음
- Requirements:
- AC-1 [S][P0]: Scenario: 하반기 배너 표시
  - Given today 2026-10-10, 1986·male·office, 수검 0건일 때
  - Then `data-testid="deadline-banner"`에 "올해 검진 마감까지 D-82"와 "남은 검진 2개 · 12월 31일이 지나면 올해 대상에서 넘어가요"가 표시된다.
  - And `logImpression('deadline_banner')`이 1회 기록된다.
- AC-2 [S][P1]: Scenario: 상반기 미표시
  - Given today 2026-06-30이면 deadline-banner는 렌더되지 않는다.
  - And 2026-07-01이면 "D-183"으로 표시된다.
- AC-3 [S][P1]: Scenario: 30일 이내 강조
  - Given today 2026-12-01이면 배너에 Badge "마감 임박"과 "마감 30일 전이에요"가 표시된다.
- AC-4 [E][P1]: Scenario: 모두 받으면 숨김
  - When 비조건부 대상 항목(general, stomach)이 모두 ON이 되면 배너가 즉시 사라진다.
  - And 대상 0개인 프로필에서는 처음부터 렌더되지 않는다.
- AC-5 [E][P2]: Scenario: 이번 달 닫기
  - When 배너의 "닫기"를 탭하면 `checkupWindow.banner.v1 = { dismissedMonth: '2026-10' }`이 저장되고 배너가 사라진다.
  - And today가 2026-11-01이 되면 다시 표시된다.
- AC-6 [W][P1]: Scenario: 손상·로딩 상태
  - Given `checkupWindow.banner.v1` 값이 파싱 불가하면 dismissedMonth는 null로 보고 배너를 정상 표시한다.
  - And store status가 'loading'인 동안 배너는 렌더되지 않는다.

### F7. 결과 심화 층 — 가족 결과 & 3개년 계획표 (리워드 게이트)
- Description: 홈의 무료 층 아래, `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 자식으로 잠금 층을 렌더한다. 잠금 층에는 본인·가족의 올해~2년 뒤 대상 계획표와 가족별 올해 결과를 둔다. 슬롯 ID가 없거나 광고를 띄우지 못하면 템플릿이 게이트를 자동으로 연다(fail-open). 가족 이름은 게이트 바깥 티저 줄에도 표시한다.
- Data: Profile(role 'family' 포함), CheckupRecord, `buildPlan` 결과
- API: 없음
- Requirements:
- AC-1 [U][P0]: Scenario: 무료 층은 광고와 무관하게 보인다
  - Given 광고가 한 번도 뜨지 않는 환경(`VITE_TOSS_AD_SLOT_ID` 미설정·광고 로드 실패·타임아웃 — 템플릿 TossRewardAd는 이때 게이트를 자동으로 연다)
  - When 사용자가 홈(/)에 진입하면
  - Then `data-testid="free-tier"` 영역에 "일반건강검진"·"위암 검진" 대상 행과 "D-82"가 표시되고, 올해 대상 확인이라는 PRD 목표가 달성된다.
- AC-2 [E][P1]: Scenario: 더 깊은 층은 게이트 뒤에 있다
  - Given 홈의 `data-testid="locked-tier"` 영역이 TossRewardAd의 자식으로 렌더될 때. 프로필은 나(1986·male·office), 엄마(1966·female·dependent), 아빠(1963·male·regional_head)다.
  - When 광고 시청이 완료되거나, 광고를 띄울 수 없어 게이트가 자동으로 열리면
  - Then locked-tier에 `plan-year-2026`, `plan-year-2027`, `plan-year-2028` Card 3장이 표시된다.
  - And plan-year-2027에는 "아빠 — 일반건강검진·위암 검진·대장암 검진"과 "나 — 조건부 간암만"이 있다.
  - And 가족 결과 행은 "엄마 · 올해 대상 5개", "아빠 · 올해 대상 1개(대장암)"다.
- AC-3 [U][P0]: Scenario: 게이트 배치 레이아웃
  - Then DOM 순서는 free-tier → AdSlot(`adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID}`) → 가족 티저 ListRow → locked-tier다.
  - And free-tier는 TossRewardAd의 자손이 아니다(테스트에서 TossRewardAd를 mock하고 children에 free-tier가 없음을 확인).
  - And 잠금 층이 렌더되면 `logImpression('reward_locked_tier')`가 기록된다.
- AC-4 [U][P1]: Scenario: 등록한 가족 이름은 게이트 밖에도 보인다
  - Given 가족 "엄마", "아빠"가 있을 때
  - Then 게이트 바깥 티저 ListRow에 "등록한 가족: 엄마 · 아빠"가 표시된다.
  - And 가족이 0명이면 "가족을 추가해 함께 확인해요"가 표시된다.
- AC-5 [S][P1]: Scenario: 가족 없음 빈 상태
  - While 가족 프로필이 0명이면 locked-tier에는 본인만 있는 3개년 Card 3장과 Asset.ContentIcon, "가족을 추가하면 함께 볼 수 있어요"가 표시된다.
  - When Button "가족 추가"를 탭하면 `navigate('/profile/new', { state: { mode: 'family' } })`가 호출되고 `logClick('family_add')`가 기록된다.
- AC-6 [E][P1]: Scenario: 가족 체크리스트 시트
  - When locked-tier의 "엄마" 행을 탭하면 BottomSheet에 엄마의 올해 대상 행 7개(조건부 2개 포함)와 F5와 같은 "받았어요" Switch, Button "정보 수정"이 표시된다.
  - And Switch ON은 엄마 profileId로 저장된다.
- AC-7 [W][P1]: Scenario: 비대상 가족도 숨기지 않음
  - Given 가족 "동생"(1997·female·dependent)일 때
  - Then locked-tier에 "동생 · 올해 대상 없음 · 다음 2027년" 행이 표시된다. 목록에서 빠지지 않는다.

### F8. 프로필 관리·기준 출처·초기화
- Description: 홈 하단 ListRow에서 내 정보 수정, 가족 삭제, 검진 기준과 출처 보기, 전체 데이터 초기화를 한다. 출처는 텍스트로만 보여 주고 외부로 이동하지 않는다. 새 라우트 없이 S2 폼과 BottomSheet·AlertDialog를 다시 쓴다.
- Data: Profile, CheckupRecord, BannerState, CheckupRule
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 내 정보 수정 후 재계산
  - Given 1986·male·office 프로필일 때
  - When "내 정보 수정"에서 출생연도를 "1987"로 바꿔 저장하면
  - Then 홈으로 돌아와 Toast "저장했어요"가 표시된다.
  - And free-tier는 "올해는 받을 국가검진이 없어요"와 "다음 대상: 2027년"을 표시한다.
- AC-2 [E][P1]: Scenario: 가족 삭제 확인
  - When 엄마 수정 화면에서 "삭제"를 탭하면 AlertDialog "엄마 프로필을 삭제할까요? 체크 기록도 함께 지워져요"가 뜬다.
  - And "삭제"를 누르면 프로필과 기록이 지워지고 `navigate('/', { replace: true, state: { toast: 'deleted' } })`가 호출된다.
  - And "취소"를 누르면 아무것도 바뀌지 않는다.
- AC-3 [W][P1]: Scenario: 본인 프로필 삭제 불가
  - While role 'self' 프로필 수정 화면이면 "삭제" Button은 렌더되지 않는다.
- AC-4 [E][P1]: Scenario: 기준 출처 시트
  - When "검진 기준과 출처"를 탭하면 BottomSheet에 CheckupRule 7개 행이 표시된다. 각 행에는 label·주기·연령·성별·출처 문구가 있다. 예: "위암 검진 · 만 40세 이상 · 2년마다 · 암관리법 시행령 별표1".
  - And 시트 안에 `<a href="http…">` 요소는 0개다.
- AC-5 [W][P0]: Scenario: 외부 도메인 이탈 금지
  - The system shall never call `window.open` or assign an external URL to `window.location.href` in `src/**`(정적 검색 테스트로 0건).
  - And "설치", "다운로드" 문구를 포함한 앱 설치 유도 텍스트는 0건이다.
- AC-6 [E][P1]: Scenario: 전체 초기화
  - When "데이터 초기화" → AlertDialog "모든 프로필과 체크 기록을 지울까요?"에서 "초기화"를 누르면
  - Then `checkupWindow.profiles.v1`, `checkupWindow.records.v1`, `checkupWindow.banner.v1`이 삭제된다.
  - And `navigate('/profile/new', { replace: true, state: { mode: 'self' } })`가 호출된다.
- AC-7 [W][P1]: Scenario: 초기화 중 오류
  - Given `localStorage.removeItem`이 예외를 던질 때
  - When 초기화를 확정하면
  - Then Toast "초기화하지 못했어요. 다시 시도해주세요"가 표시되고 홈에 남는다. console.error는 0회다.

## Assumptions
- 판정 나이는 `검진연도 − 출생연도`(연 나이)다. 공단이 출생연도 기준으로 대상자를 정한다는 전제다.
- 격년 항목(일반검진·위암·유방암·자궁경부암·폐암)은 모두 출생연도 짝·홀수 규칙을 따른다. 대장암은 매년이다.
- 간암은 실제로 6개월 주기(상·하반기)지만, MVP에서는 "올해 받음" 1회 체크로 단순화하고 다음 대상 연도를 올해+1로 표시한다.
- 고위험군 해당 여부(간질환·흡연력)는 묻지 않는다. 연령이 맞으면 "조건부" 항목으로 보여 주고 조건 문구만 안내한다.
- 의료급여수급권자에게도 암검진 기준을 건강보험 가입자와 같게 적용한다.
- 템플릿에 ScreenScaffold, SubmitFooter, Card, SummaryHero, MiniBar, AdSlot, TossRewardAd, logClick/logImpression, shareApp, requestReviewOnce가 있다. TDS mobile에 Loader 컴포넌트가 있고, 없으면 템플릿의 로딩 표시를 쓴다.
- TossRewardAd의 잠금 해제 상태가 얼마나 유지되는지(세션·마운트 단위)는 템플릿 동작을 그대로 따른다.
- 사용자 식별은 하지 않는다. 데이터는 기기 localStorage에만 있어 기기를 바꾸면 이어지지 않는다.

## Open Questions
1. 2026년 「건강검진 실시기준」(보건복지부 고시)과 암관리법 시행령 별표1의 최신 값이 위 CheckupRule 표와 같은가? 특히 확인할 것:
   - 연 나이 판정
   - 의료급여 19~64세
   - 직장가입자·지역세대주에 연령 하한이 없다는 점
2. 폐암 고위험군 정의가 "현재 흡연자" 한정인가, 금연 후 일정 기간 이내인 과거 흡연자도 포함하는가(2026 기준)? 조건 문구를 확정해야 한다.
3. 해당 연도에 받지 못한 경우 다음 해 추가 검진이 가능한가? 가능하다면 배너 문구 "12월 31일이 지나면 올해 대상에서 넘어가요"를 바꿔야 하는가?
4. 생애전환기·연령별 추가 항목도 체크리스트에 넣을 것인가? 예: 이상지질혈증, 골밀도(54·60·66세 여성), 정신건강검사(10년 단위), C형간염 항체검사(56세), 인지기능.
5. 간암을 상·하반기 2회 체크로 나눌 것인가?
6. 가족 이름을 게이트 바깥 티저 줄에 노출하는 현재 설계가 "가족 프로필은 리워드 광고 뒤"라는 PRD 의도와 맞는가?
7. 리워드 게이트를 한 번 열었을 때 해제 상태를 얼마나 유지할 것인가(세션·하루·영구)?