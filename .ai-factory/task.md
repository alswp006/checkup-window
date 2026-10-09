# TASK — 올해검진 (Checkup Window)

> **이번 수정에서 바뀐 점 (교차 검증 갭 반영)**
>
> | 갭 | 조치 | 위치 |
> |---|---|---|
> | 조건부 항목만 대상인 해의 Switch 규칙이 Task끼리 충돌 | 규칙을 하나로 정했습니다(추가 AC CS-AC-1·2). `canToggle()` 순수 함수 하나로 통일하고, 3.5·3.6 테스트도 이 규칙에 맞췄습니다. | 1.5, 3.5, 3.6, 3.8, 결정 2 |
> | 저장된 출생연도가 범위 밖이면 홈이 크래시 | 저장소가 읽을 때 모양과 범위를 검증하고, 실패하면 손상 처리합니다. `evaluateAll`은 예외를 던지지 않고, 홈에 방어 경로를 두었습니다(DV-AC-1·2). | 2.1, 1.3, 1.4, 3.4, 3.9, 4.4 |
> | 44px 터치 영역 검증 없음 | 정적 검사(TT-AC-1), 조건부 행 탭 영역(TT-AC-3), 실측 QA(TT-AC-2)를 추가했습니다. | 3.5, 4.3, **신규 4.5** |
> | 4.3이 남의 파일을 고치는 경로 | 4.3은 검사만 하고 소스는 수정하지 않습니다. 위반이 나오면 소유 Task를 재작업합니다. | 4.3, File Ownership |
> | 스캐폴드 CSS 소유자 없음 | `index.css`·`App.css` 정리와 기준선 스캔을 맡는 Task를 추가했습니다. | **신규 0.1** |
> | 광고 env 설정을 맡은 Task 없음 | 릴리스 빌드에서 env 누락과 산출물 반영 여부를 검사합니다(REL-AC-1·2). | **신규 4.6** |
> | PRD 수익 공식, 가족 노출 범위 | TASK 범위 밖입니다. 기본 동작과 수정 범위를 정해 두고 "빌드 전 확인 필요"에 올렸습니다. | §5 |

## 0. 공통 전제 (모든 Task에 적용)

**기술 스택**
- Vite + React + TypeScript, `@toss/tds-mobile`, `react-router-dom`, localStorage. 서버 코드와 외부 API는 없습니다.

**테스트**
- Vitest와 Testing Library를 씁니다.
- 날짜는 `vi.setSystemTime`으로 고정합니다. 기준일은 **2026-10-10**(로컬 시간)입니다.

**템플릿 제공 항목 (새로 만들거나 바꾸지 않음)**
- 컴포넌트: ScreenScaffold, SubmitFooter, Card, SummaryHero, MiniBar, AdSlot, TossRewardAd
- 유틸: logClick, logImpression, shareApp, requestReviewOnce
- import 경로는 템플릿의 실제 경로를 그대로 씁니다.

**TDS 규칙**
- UI는 TDS 컴포넌트로만 조립합니다.
- 간격은 `Spacing size`로만 줍니다.
- 커스텀 CSS는 flex·grid 배치에만 씁니다. height·padding·margin·font-size·line-height 선언은 0건이어야 합니다(TT-AC-1).
- HEX 색상은 쓰지 않고 `var(--adaptive*)`만 씁니다.

**금지 API·기능**
- 호환성 때문에 쓰지 않는 API: `crypto.randomUUID`, `structuredClone`, `Array.prototype.at`, `Object.hasOwn`
- 쓰지 않는 기능: 외부 URL 이동, 외부 분석 SDK, `grantPromotionReward`, IAP

**화면 공통**
- 모든 화면의 Top title은 "올해검진"입니다.

**완료 조건 (모든 Task)**
- `npm run build`(tsc 포함)와 `npm test`가 통과한다.
- 각 파일은 §6 File Ownership 표의 한 Task에서만 만들거나 수정한다.
- 자기 Files 목록 안에서 `grep -nE '#[0-9a-fA-F]{3,8}\b'` 결과가 0건이다. 4.3은 이것을 다시 검사할 뿐 대신 고쳐 주지 않는다.

### 0-A. 추가 수용 기준 (SPEC AC와 별도로 필수)

**라우트 상태 계약**

| ID | 화면 | 통과 조건 |
|---|---|---|
| RS-AC-1 | `/` | state 없이 들어와도(새로고침·직접 진입) 크래시하지 않는다. 토스트 없이 정상 렌더하거나, 본인 프로필이 없으면 `/profile/new`로 replace 이동한다. |
| RS-AC-2 | `/profile/new` | state 없이 직접 들어와도 크래시하지 않는다. 본인 프로필 유무로 모드를 추론해 폼을 렌더한다. |
| RS-AC-3 | `/profile/:profileId/edit` | id가 없거나 비어 있어도 크래시하지 않고 `navigate('/', { replace: true })`로 이동한다. |
| RS-AC-4 | 모든 화면 | state 모양이 계약과 다르면(예: `{ toast: 'xyz' }`, `{ mode: 1 }`) null로 취급한다. |

**조건부 Switch 규칙** (SPEC F5-AC5 해석. §5에서 SPEC 반영을 요청함)

| ID | 통과 조건 |
|---|---|
| CS-AC-1 | today 2026-10-10, 1985·male·office, 기록 없음일 때 free-tier는 다음을 모두 만족한다. ① "올해는 받을 국가검진이 없어요"와 "다음 대상: 2027년"이 보인다. ② `checkup-item-liver` 행에 "조건부" Badge가 있고, 설명은 "조건에 해당하면 올해 대상"이다. ③ 화면의 Switch는 0개다. ④ "D-" 문구는 0건이다. ⑤ `deadline-banner`는 0개다. |
| CS-AC-2 | 1986·male·office(eligibleCount 2)이면 liver 행에도 Switch가 있다. free-tier의 Switch는 general·stomach·liver 3개다. |

규칙: `canToggle(status, eligibleCount) = status.eligibleThisYear && !(status.conditional && eligibleCount === 0)`

**저장 데이터 검증**

| ID | 통과 조건 |
|---|---|
| DV-AC-1 | `checkupWindow.profiles.v1`에 birthYear 1900 또는 (올해+1)인 프로필이 있으면 손상으로 처리한다. ① profiles는 `[]`이다. ② 원본은 `.corrupt`에 보관된다. ③ recovered는 true다. ④ 홈은 Toast "저장된 정보를 불러오지 못해 새로 시작해요"를 1회 띄운 뒤 `/profile/new`로 이동한다. ⑤ 크래시는 0회다. |
| DV-AC-2 | 저장소 검증을 우회해(mock) 범위 밖 birthYear 프로필이 store에 들어와도 크래시하지 않는다. ① `evaluateAll`은 throw하지 않고 그 프로필을 결과에서 뺀다. ② 본인이면 `/profile/{id}/edit`로 replace 이동한다. ③ 가족이면 "{이름} · 출생연도를 확인해주세요" 행이 남는다. |

**터치 영역** (SPEC S1 "44px 이상", F3-AC8)

| ID | 통과 조건 |
|---|---|
| TT-AC-1 | 다음 파일에서 CSS의 `height`, `min-height`, `max-height`, `padding*`, `margin*`, `font-size`, `line-height` 선언이 0건이다. 인라인 `style={{…}}`의 같은 키도 0건이다. TDS 기본 크기를 줄이지 않았다는 정적 증거다. 대상 파일: `src/{domain,data,lib,pages,components/home}/**`, `src/App.tsx`, `src/index.css`, `src/App.css` |
| TT-AC-2 | 360×740 뷰포트에서 실측한 높이가 모두 ≥ 44px이다. 대상: ListRow(가입 유형 5개, 항목 행, 하단 3개, 가족 행, 티저), Switch 클릭 요소, Button(결과 공유하기, 가족 추가, 닫기, 삭제, 정보 수정), SubmitFooter 버튼. 결과는 `docs/qa/touch-targets.md`에 기록한다. |
| TT-AC-3 | 조건부 행은 ListRow 전체가 시트 트리거다. 행의 라벨·Badge·설명을 탭하면 BottomSheet가 열린다. Switch를 탭하면 시트는 0회 열린다. |

**릴리스 환경변수**

| ID | 통과 조건 |
|---|---|
| REL-AC-1 | `npm run build:release`는 `VITE_TOSS_AD_SLOT_ID`·`VITE_TOSS_AD_GROUP_ID`(process env와 `.env.production*` 병합 결과) 중 하나라도 비어 있으면 빌드 전에 exit 1로 끝난다. 메시지 "{변수명}가 비어 있어요"를 출력한다. |
| REL-AC-2 | 빌드 후 `dist/assets/*.js`에 두 값이 모두 문자열로 들어 있으면 exit 0, 하나라도 없으면 exit 1이다. |

**필수 수신 패턴**
```ts
const raw = (useLocation().state as RouteState['/']) ?? null;
const state = raw && (raw.toast === 'saved' || raw.toast === 'deleted') ? raw : null;
```
다음 두 패턴은 쓰지 않습니다.
- `const { toast } = useLocation().state as X`
- `(useLocation().state as X).mode`

---

## Epic 0. 스캐폴드 정리

**Risk Analysis**
- Complexity: Low
- 위험 요인
  - Vite 기본 `index.css`·`App.css`의 HEX 색상과 여백 규칙이 4.3 검사에 걸립니다.
  - 템플릿 파일 자체에 HEX가 있으면 어떤 Task도 고칠 권한이 없습니다.
- 완화 방법
  - 소유자를 정하고, 기준선 스캔 결과를 문서로 남깁니다.

### Task 0.1 스캐폴드 CSS 정리 & 검수 기준선 스캔
- Description: Vite 기본 스타일을 지우고, 템플릿 전체의 HEX 기준선을 기록합니다. 템플릿 컴포넌트 파일은 수정하지 않습니다.
- DoD:
  - [ ] `src/index.css`
    - Vite 기본 규칙(`:root` 색·폰트, `a`, `button`, `h1`, `body` 여백·색, `@media (prefers-color-scheme)`)을 모두 지운다.
    - 남는 선언은 display, flex*, grid*, gap, align*, justify*뿐이다. 빈 파일이어도 된다.
    - 색 선언은 0건이다.
  - [ ] `src/App.css`
    - 내용을 비운다. 파일은 남겨서 템플릿 `App.tsx`의 import가 4.2 전까지 빌드되게 한다.
    - 파일이 원래 없으면 만들지 않는다.
  - [ ] `grep -rnE '#[0-9a-fA-F]{3,8}\b' src --include=*.ts --include=*.tsx --include=*.css`(테스트 파일 제외) 결과를 `docs/qa/compliance-baseline.md`에 파일별 건수 표로 기록한다.
    - 이 Task가 소유한 두 파일은 0건이다.
  - [ ] 템플릿 파일에서 HEX가 1건 이상 나오면 고치지 않는다. 문서에 경로와 줄 번호를 적고 §5 "빌드 전 확인 필요"에 차단 항목으로 보고한다.
  - [ ] `npm run build`가 통과한다.
- Covers: [F4-AC8 (기준선), TT-AC-1 (스캐폴드 CSS)]
- Files: [src/index.css, src/App.css, docs/qa/compliance-baseline.md]
- Depends on: none

---

## Epic 1. Data Layer — 타입 & 판정 엔진 (순수 코드)

**Risk Analysis**
- Complexity: Medium
- 위험 요인
  - 짝·홀수, 연령 상하한, 비사무직 매년, 수검 후 다음 연도 규칙이 서로 얽혀 경계값을 틀리기 쉽습니다.
  - D-day가 ±1 어긋날 수 있습니다.
  - 기준값이 여러 곳에 흩어질 수 있습니다.
  - 범위 밖 출생연도의 RangeError가 UI까지 전파될 수 있습니다.
- 완화 방법
  - 타입 → 규칙 상수 → 엔진 순서로 나누고, SPEC 예시값으로 먼저 단위 테스트를 통과시킵니다.
  - 기준값은 `rules.ts` 한 곳에만 둡니다.
  - 날짜는 `new Date(y, m, d)`로 자정에 맞추고 `Math.round(diff / 86400000)`로 셉니다.
  - throw는 `evaluateProfile`에서만 하고, 묶음 함수(`evaluateAll`·`buildPlan`)는 throw하지 않습니다.

### Task 1.1 TypeScript 타입 + RouteState 정의
- Description: 엔티티, 계산 결과, 저장소 결과, 라우트 상태 타입을 정의합니다. 런타임 코드는 0줄입니다.
  - `Sex`, `InsuranceType`, `CheckupItemId`는 법정 기준이라 닫힌 유니온으로 둡니다(사용자 맞춤 규칙의 예외).
  - Profile은 `{ id, name, role }` 목록 구조입니다.
- DoD:
  - [ ] SPEC Data Models의 다음 타입을 필드명과 타입까지 SPEC과 똑같이 export한다.
    - `Sex`, `InsuranceType`, `CheckupItemId`
    - `CheckupRule`, `Profile`, `CheckupRecord`, `BannerState`
    - `ItemStatus`, `ProfileResult`
    - `HomeLocationState`, `ProfileFormLocationState`
  - [ ] 다음 보조 타입을 export한다.
    - `ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>`
    - `EvaluableProfile = Pick<Profile, 'birthYear' | 'sex' | 'insuranceType'> & Partial<Pick<Profile, 'id' | 'name'>>`
    - `PlanYear { year: number; items: ItemStatus[] }`
    - `StoreError = 'STORAGE_FULL' | 'FAMILY_LIMIT' | 'DUPLICATE_NAME' | 'SELF_EXISTS'`
    - `StoreResult = { ok: true } | { ok: false; error: StoreError }`
    - `StoreStatus = 'loading' | 'ready'`
    - `StoredEnvelope<T> { version: 1; data: T }`
  - [ ] `RouteState`를 export한다.
    - `'/'`: HomeLocationState
    - `'/profile/new'`: ProfileFormLocationState
    - `'/profile/:profileId/edit'`: null
  - [ ] `RouteParams = { '/profile/:profileId/edit': { profileId: string } }`를 export한다.
  - [ ] 정적 검사에서 파일 안의 `function`, `const`, `class`, `enum` 선언이 0개다.
- Covers: [RS-AC-1, RS-AC-2, RS-AC-3, RS-AC-4 (타입 기반)]
- Files: [src/lib/types.ts]
- Depends on: none

### Task 1.2 검진 기준 상수(CheckupRule)와 표시용 문구
- Description: CheckupRule 7개, 가입유형별 일반검진 규칙, 가입 유형 라벨·설명, 출처 문구 포맷터를 둡니다. 기준값은 이 파일 밖에서 정의하지 않습니다.
- DoD:
  - [ ] `CHECKUP_RULES: readonly CheckupRule[]`를 정의한다.
    - 순서: general, stomach, colorectal, breast, cervical, liver, lung
    - 값은 SPEC 표와 같다.
    - liver: conditional true, conditionText "간경변증, B형간염 항원 양성, C형간염 항체 양성, B형·C형 간염 바이러스에 의한 만성 간질환자"
    - lung: conditional true, conditionText "30갑년 이상 흡연력을 가진 흡연자", 54~74세
  - [ ] `GENERAL_RULE_BY_INSURANCE`를 정의한다.
    - nonoffice: annual
    - office, regional_head: biennial
    - dependent: biennial, 20세 이상
    - medical_aid: biennial, 19~64세
  - [ ] `INSURANCE_OPTIONS` 5개를 `{ value, label, description }`로 정의한다.

    | label | description |
    |---|---|
    | 직장가입자(사무직) | 2년마다 대상이에요 |
    | 직장가입자(비사무직) | 매년 검진 대상이에요 |
    | 지역가입자 세대주 | 2년마다 대상이에요 |
    | 피부양자·세대원 | 만 20세 이상부터 대상이에요 |
    | 의료급여수급권자 | 만 19~64세가 대상이에요 |

  - [ ] `shortLabel(id)`: "간암 검진" → "간암", "대장암 검진" → "대장암", "일반건강검진"은 그대로.
  - [ ] `formatRuleSourceRow(rule)` 테스트
    - stomach는 정확히 "위암 검진 · 만 40세 이상 · 2년마다 · 암관리법 시행령 별표1"이다.
    - breast는 "여성"을 포함한다.
    - lung은 "만 54~74세"를 포함한다.
    - general은 "가입 유형별"과 "비사무직 매년"을 포함한다.
  - [ ] 파일 안 문자열에 `http`가 0건이다.
- Covers: [F8-AC4 (데이터), F3-AC8 (설명 문구 데이터)]
- Files: [src/domain/rules.ts, src/domain/rules.test.ts]
- Depends on: Task 1.1

### Task 1.3 판정 엔진 — evaluateProfile · isEvaluable · daysUntilYearEnd
- Description: 프로필 하나와 연도 하나에 대한 항목별 판정, D-day, 출생연도 유효성 판정을 하는 순수 함수입니다.
- DoD:
  - [ ] `daysUntilYearEnd(today)`가 다음 값을 반환한다.
    - (2026,9,10) → 82
    - (2026,11,1) → 30
    - (2026,11,31,23,59) → 0
    - (2026,6,1) → 183
  - [ ] `isEvaluable(profile, year): boolean`
    - 조건: `Number.isInteger(birthYear) && 1920 <= birthYear && birthYear <= year`
    - 이 함수는 throw하지 않는다.
  - [ ] `evaluateProfile(profile, records, today): ProfileResult`
    - 나이: `age = year − birthYear`
    - `!isEvaluable`이면 `RangeError('INVALID_BIRTH_YEAR')`를 던진다.
    - 성별이 맞지 않는 항목은 items에서 뺀다.
    - 격년 대상 조건: `birthYear % 2 === year % 2`
    - received: profile.id가 같고 year가 올해인 record가 있을 때만 true
    - nextYear 결정
      - 올해 대상이고 미수검이면 올해
      - 수검했으면 매년 항목은 +1, 격년 항목은 +2부터 탐색
      - 그 밖에는 올해+1부터 탐색
      - 연령 상한을 넘으면 null
    - eligibleCount, receivedCount는 conditional 항목을 빼고 센다.
    - nextCheckupYear: conditional 항목을 뺀 nextYear 중 올해보다 큰 가장 이른 해
  - [ ] reason 문구
    - 짝·홀 불일치: `"{Y}년 대상(홀수년 출생)"` 또는 `"…(짝수년 출생)"`
    - 상한 초과: `"대상 연령({min}~{max}세)이 아니에요"`
    - 하한 미달: `"{Y}년 대상(만 {min}세부터)"`
    - 대상: `"올해 대상"`
    - 수검: `"올해 받았어요"`
  - [ ] 테스트 F1-AC1: 1986·male·office
    - general {true, 2026}, stomach {true, 2026}
    - liver {eligibleThisYear: true, conditional: true}
    - colorectal {false, 2036}
    - eligibleCount 2, age 40, breast·cervical 없음
  - [ ] 테스트 F1-AC2
    - 1987·nonoffice → general true
    - 1987·office → {false, 2027, "2027년 대상(홀수년 출생)"}
  - [ ] 테스트 F1-AC3: 1966·female·dependent → 비조건부 5개 true, liver·lung conditional, eligibleCount 5
  - [ ] 테스트 F1-AC4
    - 1986·office + general 2026 기록 → {received: true, nextYear: 2028}
    - 1990·nonoffice + general 2026 기록 → {received: true, nextYear: 2027}
    - 1986 프로필에서 general·stomach 둘 다 수검 → nextCheckupYear 2028
  - [ ] 테스트 F1-AC6
    - 1960·medical_aid → general {false, null, "대상 연령(19~64세)이 아니에요"}
    - 1950 → lung null
    - 2008·female·dependent → general·cervical 2028
  - [ ] 테스트 F1-AC7
    - 1919, 2027 입력은 RangeError를 던진다.
    - `isEvaluable`은 1919 → false, 2027 → false, 1920 → true, 2026 → true, 1986.5 → false
  - [ ] 테스트 F5-AC8: 1985·office + {general, 2025} 기록 → general {false, 2027}, receivedCount 0
  - [ ] 테스트 CS-AC-1(데이터): 1985·male·office, 기록 없음 → eligibleCount 0, liver {eligibleThisYear: true, conditional: true}, nextCheckupYear 2027
  - [ ] 파일 안에 React, localStorage, `new Date()` 호출이 0건이다.
- Covers: [F1-AC1 ~ F1-AC7, F5-AC8, CS-AC-1 (데이터), DV-AC-2 (판정 함수)]
- Files: [src/domain/checkup.ts, src/domain/checkup.test.ts]
- Depends on: Task 1.2

### Task 1.4 판정 엔진 — buildPlan · evaluateAll · 계획표 문구
- Description: 전체 프로필 평가, 3개년 계획표, 계획표 행과 가족 행 문구를 만듭니다. 묶음 함수는 잘못된 프로필이 섞여 있어도 throw하지 않습니다.
- DoD:
  - [ ] `evaluateAll(profiles, records, today): ProfileResult[]`
    - `isEvaluable`이 false인 프로필은 결과에서 빼고 throw하지 않는다.
    - `evaluateAll([], [], today)`는 `[]`를 반환한다.
    - 테스트: [1986 정상, 1900 비정상] → 길이 1, 예외 없음
  - [ ] `buildPlan(profile, records, today, years = 3): PlanYear[]`
    - `isEvaluable`이 false이면 `[]`를 반환한다(throw 없음).
    - 1986·male·office: 연도 [2026, 2027, 2028]을 반환한다. 2027의 비조건부 대상은 0개, 2028은 general·stomach다.
  - [ ] `formatPlanLine(name, items | null)`
    - 비조건부 대상이 있으면 `"{name} — {label·label}"`
    - 조건부만 있으면 `"{name} — 조건부 {shortLabel}만"`
    - 대상이 없으면 `"{name} — 대상 없음"`
    - items가 null이면 `"{name} — 출생연도를 확인해주세요"`
    - 테스트: 2027 아빠(1963·male·regional_head) → "아빠 — 일반건강검진·위암 검진·대장암 검진"
    - 테스트: 2027 나(1986) → "나 — 조건부 간암만"
  - [ ] `formatFamilyRow(name, result | null)`
    - 대상 1개: `"{name} · 올해 대상 1개({shortLabel})"`
    - 대상 2개 이상: `"{name} · 올해 대상 N개"`
    - 대상 0개: `"{name} · 올해 대상 없음 · 다음 {Y}년"`
    - result가 null이면 `"{name} · 출생연도를 확인해주세요"`
    - 테스트: "엄마 · 올해 대상 5개", "아빠 · 올해 대상 1개(대장암)", 동생(1997·female·dependent) "동생 · 올해 대상 없음 · 다음 2027년"
- Covers: [F1-AC8, F7-AC2 (계산·문구), F7-AC7 (문구), DV-AC-2 (묶음 함수·문구)]
- Files: [src/domain/plan.ts, src/domain/plan.test.ts]
- Depends on: Task 1.3

### Task 1.5 표시 문구 · Switch 가능 여부 · 마감 배너 판정 (순수 함수)
- Description: 항목 행 설명, Switch 렌더 여부, 히어로 문구, 배너 노출 여부와 문구를 만듭니다. 3.5·3.6·3.8은 Switch 여부를 직접 계산하지 않고 이 함수만 씁니다.
- DoD:
  - [ ] `canToggle(status, eligibleCount): boolean`
    - 정의: `status.eligibleThisYear && !(status.conditional && eligibleCount === 0)`
    - 테스트: 비대상 → false, 대상 비조건부 → true, 조건부이고 eligibleCount 2 → true, 조건부이고 eligibleCount 0 → false
  - [ ] `itemDescription(status, eligibleCount)` (위에서부터 먼저 맞는 규칙 적용)
    1. 수검: "받았어요 · 다음 대상 {Y}년" (nextYear가 null이면 "받았어요")
    2. 조건부이고 대상인데 eligibleCount가 0: "조건에 해당하면 올해 대상"
    3. 대상·미수검: "올해 대상 · 12월 31일까지"
    4. 비대상이고 nextYear 있음: "다음 대상 {Y}년"
    5. 비대상이고 nextYear null: reason
  - [ ] `heroText(result)`
    - 진행 중: `{ count, title: "올해 대상 N개", sub: "D-{daysLeft}" }`
    - 모두 수검: "올해 검진 완료 · 다음 검진 {Y}년"
    - 대상 0개: `{ empty: true, next: "다음 대상: {Y}년" }`
  - [ ] `monthKey(today)`는 로컬 기준 'YYYY-MM'을 반환한다.
  - [ ] `bannerView(result, banner, today)`
    - 다음 네 조건을 모두 만족할 때만 객체를 반환하고, 아니면 null이다.
      - 월 ≥ 7
      - eligibleCount > 0
      - receivedCount < eligibleCount
      - dismissedMonth ≠ monthKey(today)
    - 반환 객체: `{ title: "올해 검진 마감까지 D-{n}", body: "남은 검진 {k}개 · 12월 31일이 지나면 올해 대상에서 넘어가요", urgent: n <= 30, urgentText: "마감 {n}일 전이에요" }`
  - [ ] 테스트
    - 2026-06-30 → null
    - 2026-07-01 → D-183
    - 2026-12-01 → urgent, "마감 30일 전이에요"
    - 전부 수검 → null
    - 대상 0개 → null
    - 조건부만 대상(1985·office) → null
    - dismissed '2026-10'이고 오늘이 10월 → null
    - dismissed '2026-10'이고 오늘이 2026-11-01 → 객체
- Covers: [F6-AC1 ~ F6-AC4, F6-AC5 (판정), F5-AC1, F5-AC2, F5-AC3, F5-AC5 (규칙), F4-AC3 (빈 상태 문구), CS-AC-1, CS-AC-2 (규칙)]
- Files: [src/domain/format.ts, src/domain/banner.ts, src/domain/format.test.ts, src/domain/banner.test.ts]
- Depends on: Task 1.3

---

## Epic 2. Data Layer — 저장소 & 상태 관리 (API Routes 해당 없음: 서버·외부 API 없음)

**Risk Analysis**
- Complexity: Medium
- 위험 요인
  - 손상된 JSON이나 범위 밖 값이 들어오면 크래시할 수 있습니다.
  - QuotaExceededError가 나면 메모리와 스토리지 내용이 어긋날 수 있습니다.
  - 프로필 삭제 후 수검 기록이 고아로 남을 수 있습니다.
  - StrictMode에서 토스트가 두 번 뜰 수 있습니다.
  - 저장 데이터는 60KB 미만(한도의 1.2%)이지만 쿼터를 다른 데이터와 공유합니다.
- 완화 방법
  - 읽기 시점에 모양·범위를 검증하고 실패하면 손상 경로로 보냅니다.
  - 스토리지 쓰기가 성공한 뒤에만 메모리를 갱신합니다.
  - 예외는 결과값으로 바꿉니다.

### Task 2.1 localStorage 원시 함수 + 읽기 검증기
- Description: 엔벨로프를 안전하게 읽고 씁니다. 모양·범위를 검증하고, 손상 값을 격리하고, 쿼터 오류를 결과값으로 바꾸고, ID를 생성합니다.
- DoD:
  - [ ] 키 상수
    - `KEYS.profiles = 'checkupWindow.profiles.v1'`
    - `KEYS.records = 'checkupWindow.records.v1'`
    - `KEYS.banner = 'checkupWindow.banner.v1'`
  - [ ] `readEnvelope(key, isValid)`
    - 값이 없으면 `{ data: [], recovered: false }`
    - 파싱 실패, `version !== 1`, `isValid(data) === false`이면 원본을 `key + '.corrupt'`에 보관하고 `{ data: [], recovered: true }`
  - [ ] `isProfileList(v, currentYear)`가 true인 조건(모두 만족)
    - 배열이고 길이 ≤ 10
    - 각 원소가 다음을 만족한다.
      - id: 빈 문자열이 아닌 문자열, 중복 없음
      - name: 1~10자 문자열
      - role ∈ {'self', 'family'}이고, self는 1개 이하
      - birthYear: 정수, 1920 ≤ birthYear ≤ currentYear
      - sex ∈ {'male', 'female'}
      - insuranceType ∈ `INSURANCE_OPTIONS`의 value
      - createdAt, updatedAt: 문자열
  - [ ] `isRecordList(v)`가 true인 조건
    - 배열이고, 각 원소의 profileId는 문자열, itemId ∈ `CHECKUP_RULES`의 id, year는 정수, receivedAt은 문자열
  - [ ] `readBanner()`는 파싱 불가나 모양 불일치일 때 `{ dismissedMonth: null }`을 반환하고 throw하지 않는다.
  - [ ] `writeJson(key, value): StoreResult`는 setItem 예외를 `{ ok: false, error: 'STORAGE_FULL' }`로 바꾼다.
  - [ ] `removeKeys(keys): StoreResult`는 removeItem 예외를 `{ ok: false, error: 'STORAGE_FULL' }`로 바꾼다.
  - [ ] `newId()`는 `Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)`로 만든다.
  - [ ] 파일 안에 console.error 호출이 0건이다.
  - [ ] 테스트
    - `"{oops"` → recovered true, `.corrupt` 보관
    - DV-AC-1: birthYear 1900 / 2027(currentYear 2026) / 1986.5 각각 → recovered true, data `[]`, `.corrupt`에 원본
    - self 2개 → recovered true
    - 정상 1986 프로필 → recovered false, 길이 1
    - 알 수 없는 itemId 'heart' 기록 → recovered true
    - 쿼터 오류 변환
    - 손상된 배너 값 → null
- Covers: [F2-AC4 (저장소), F2-AC5 (오류 변환), F6-AC6 (손상 → null), DV-AC-1 (검증)]
- Files: [src/data/storage.ts, src/data/storage.test.ts]
- Depends on: Task 1.2

### Task 2.2 프로필 CRUD
- Description: 현재 스냅샷을 받아 새 스냅샷과 결과를 돌려주는 프로필 추가·수정·삭제입니다. 검증은 role 필드 기준입니다.
- DoD:
  - [ ] `addProfile(snapshot, input, now)`는 `{ result, next? }`를 반환한다.
    - 검사 순서: SELF_EXISTS → FAMILY_LIMIT(가족 9명) → DUPLICATE_NAME(trim 후 비교) → STORAGE_FULL
  - [ ] 성공하면 `checkupWindow.profiles.v1`에 `{ version: 1, data: [{ …, id(빈 문자열 아님), createdAt, updatedAt }] }`가 저장된다.
  - [ ] `updateProfile(snapshot, id, patch, now)`
    - 이름 중복 검사에서 자기 자신은 뺀다.
    - updatedAt만 갱신한다.
    - role은 바꿀 수 없다.
  - [ ] `deleteProfile(snapshot, id)`
    - role 'self'는 거부한다.
    - 그 profileId의 records도 함께 지운다.
  - [ ] 실패하면 next가 없고, localStorage 기존 값이 바이트 단위로 같다.
  - [ ] 테스트
    - F2-AC1: 빈 저장소에 본인 저장
    - F2-AC3: self가 이미 있으면 길이 1 유지
    - F2-AC5: setItem throw → STORAGE_FULL, 기존 값 유지
    - F2-AC6: 10번째 가족 → FAMILY_LIMIT, "엄마" 중복 → DUPLICATE_NAME
    - F2-AC8: 엄마 기록 3건 삭제, 다른 프로필 기록 수 유지
- Covers: [F2-AC1, F2-AC3, F2-AC5, F2-AC6, F2-AC8]
- Files: [src/data/profileRepo.ts, src/data/profileRepo.test.ts]
- Depends on: Task 2.1

### Task 2.3 수검 기록 토글 · 배너 닫기 · 전체 초기화
- Description: 기록 토글, 오래된 기록 정리, 배너 닫기 저장, 전체 초기화입니다.
- DoD:
  - [ ] `toggleRecord(snapshot, profileId, itemId, year, now)`
    - 기록이 없으면 1건 추가, 있으면 그 1건 삭제
    - (profileId, itemId, year) 조합은 유일하다.
    - 저장할 때 `year < 올해 − 5`인 기록은 지운다.
  - [ ] `dismissBanner(month)`는 `checkupWindow.banner.v1 = { dismissedMonth: month }`를 저장한다.
  - [ ] `resetAll()`은 세 키를 모두 지운다. 예외가 나면 `{ ok: false }`를 반환하고 console.error는 0회다.
  - [ ] 테스트
    - F2-AC2: 1회 토글 → 1건, 2회 → 0건
    - 2026년 저장 시 2020년 기록이 정리된다.
    - F6-AC5: 저장값이 `{ dismissedMonth: '2026-10' }`
    - F8-AC6: 초기화 후 세 키 모두 null
    - F8-AC7: removeItem throw → ok:false, console.error spy 0회
- Covers: [F2-AC2, F6-AC5 (저장), F8-AC6 (저장소), F8-AC7 (저장소)]
- Files: [src/data/recordRepo.ts, src/data/recordRepo.test.ts]
- Depends on: Task 2.1

### Task 2.4 상태 관리 — CheckupStoreProvider · useCheckupStore
- Description: React Context로 저장소 상태와 액션을 제공합니다. 첫 읽기는 effect에서 하므로 첫 렌더는 항상 'loading'입니다.
- DoD:
  - [ ] `useCheckupStore()`가 다음을 반환한다.
    - 상태: status, profiles, records, banner, recovered
    - 함수: ackRecovered
    - 액션: addProfile, updateProfile, deleteProfile, toggleRecord, dismissBanner, resetAll (모두 StoreResult 반환)
  - [ ] 첫 읽기
    - `readEnvelope(KEYS.profiles, v => isProfileList(v, new Date().getFullYear()))`와 `readEnvelope(KEYS.records, isRecordList)`를 쓴다.
    - 둘 중 하나라도 recovered이면 recovered는 true다.
  - [ ] 첫 렌더 status는 'loading'이다. 읽기가 끝나면 'ready'가 되고, 저장값이 없으면 profiles·records는 `[]`다.
  - [ ] 액션이 ok:false이면 profiles·records 배열 참조가 바뀌지 않는다.
  - [ ] recovered는 ackRecovered() 호출 뒤 false가 된다.
  - [ ] `renderWithProviders(ui, { route, state, storage })` 헬퍼를 만든다. MemoryRouter와 Provider로 감싸고, initialEntries에 state를 넣는다.
  - [ ] 테스트
    - F2-AC7: loading → ready, 빈 값
    - F2-AC4: `"{oops"` → recovered true
    - DV-AC-1: birthYear 1900 저장값 → recovered true, profiles `[]`
    - F2-AC5: STORAGE_FULL이면 참조 유지
- Covers: [F2-AC4 (플래그), F2-AC5 (메모리 불변), F2-AC7, DV-AC-1 (연결)]
- Files: [src/data/CheckupStoreProvider.tsx, src/data/useCheckupStore.ts, src/data/CheckupStoreProvider.test.tsx, src/test/renderWithProviders.tsx]
- Depends on: Task 2.2, Task 2.3

---

## Epic 3. Core UI Pages & 화면 블록

**Risk Analysis**
- Complexity: High(홈 블록), Medium(폼)
- 위험 요인
  - 홈에 기능이 몰려 패킷이 커질 수 있습니다.
  - 게이트가 무료 층까지 감쌀 수 있습니다.
  - state를 null 확인 없이 쓰면 크래시합니다.
  - 토스트가 중복될 수 있습니다.
  - Switch 롤백이 어긋날 수 있습니다.
  - TDS 여백을 덮어쓰거나 Badge처럼 작은 탭 영역이 생길 수 있습니다.
- 완화 방법
  - 블록과 훅을 먼저 만들고, 페이지 파일은 조립만 합니다. 파일 하나는 Task 하나만 작성합니다.
  - Switch 여부와 문구는 1.5 함수만 씁니다.
  - 탭 영역은 ListRow 단위로 둡니다(TT-AC-3).

### Task 3.1 프로필 폼 필드 — ProfileFormFields + validate
- Description: 라우팅·저장소와 무관한 폼 본문과 순수 검증 함수입니다. 신규와 수정 모드가 함께 씁니다.
- DoD:
  - [ ] `validateProfileForm(values, currentYear)`는 필드별 오류를 반환한다.
    - 이름 빈 값: "이름을 입력해주세요"
    - 4자리 미만: "출생연도 4자리를 입력해주세요"
    - 범위 밖: "1920~{currentYear}년 사이로 입력해주세요"
    - 성별 누락: "성별을 선택해주세요"
    - 가입 유형 누락: "가입 유형을 선택해주세요"
  - [ ] `ProfileFormFields` props: `{ initial?, submitLabel, disabled?, disabledReason?, nameError?, onSubmit(values) }`
  - [ ] 입력 요소
    - TextField "이름": maxLength 10
    - TextField "출생연도": inputMode "numeric", maxLength 4, placeholder "예: 1990"
      - 숫자가 아닌 문자는 즉시 지운다. "19a8" → "198"
      - Enter를 누르면 blur된다.
    - Chip+ChipItem "남성", "여성"
    - 가입 유형 ListRow 5개
      - INSURANCE_OPTIONS의 라벨·설명, 단일 선택, 우측 체크
      - ListRow 전체가 선택 탭 영역이다.
      - style·className으로 크기·여백을 지정하지 않는다.
  - [ ] 오류 표시
    - 오류는 해당 블록 아래 Paragraph.Text로 표시한다.
    - 오류가 있으면 onSubmit은 0회 호출된다.
    - `nameError`가 있으면 이름 아래에 표시한다.
  - [ ] 제출 버튼
    - SubmitFooter 버튼 라벨은 submitLabel이다.
    - 탭할 때마다 `logClick('profile_submit')`를 1회 기록한다.
    - disabled이면 버튼이 비활성이고 disabledReason을 표시한다.
  - [ ] 테스트
    - F3-AC2: "198", "1919", "2027"(currentYear 2026) 메시지, onSubmit 0회
    - F3-AC3: 성별·가입 유형 누락 메시지
    - F3-AC4: 빈 이름 메시지, `nameError="이미 같은 이름의 프로필이 있어요"` 표시, disabled와 "가족은 최대 9명까지 추가할 수 있어요" 표시
    - F3-AC5: inputMode·maxLength, "19a8" → "198", Enter 뒤 activeElement가 입력란이 아님
    - F3-AC8: ListRow 5개, 설명 문구 3종, 렌더된 DOM의 ListRow 루트 5개 모두 `style` 속성 없음, 설명 텍스트 탭 시 해당 유형 선택
- Covers: [F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC8]
- Files: [src/pages/profileForm/validate.ts, src/pages/profileForm/validate.test.ts, src/pages/profileForm/ProfileFormFields.tsx, src/pages/profileForm/ProfileFormFields.test.tsx]
- Depends on: Task 1.2

### Task 3.2 프로필 삭제 버튼 — DeleteProfileButton
- Description: 삭제 버튼과 확인 AlertDialog를 묶은 컴포넌트입니다. 저장소에 의존하지 않고 콜백만 받습니다.
- DoD:
  - [ ] props: `{ profileName: string; onConfirm: () => void }`
  - [ ] Button "삭제"(type danger)를 탭하면
    - `logClick('profile_delete')`를 1회 기록한다.
    - AlertDialog "{profileName} 프로필을 삭제할까요? 체크 기록도 함께 지워져요"를 연다.
  - [ ] 다이얼로그 "삭제" → onConfirm 1회. "취소" → onConfirm 0회, 다이얼로그 닫힘.
  - [ ] 테스트(profileName "엄마"): 문구 일치, 삭제·취소 분기, logClick 1회
- Covers: [F8-AC2 (다이얼로그)]
- Files: [src/pages/profileForm/DeleteProfileButton.tsx, src/pages/profileForm/DeleteProfileButton.test.tsx]
- Depends on: Task 1.1

### Task 3.3 프로필 페이지 — ProfileFormPage (`/profile/new`, `/profile/:profileId/edit`)
- Description: 신규(본인·가족)와 수정 모드를 처리합니다. 3.1의 필드와 3.2의 삭제 버튼을 조립하고, 저장소와 이동을 연결합니다.
- DoD:
  - [ ] 공통
    - ScreenScaffold, Top title "올해검진"
    - status가 'loading'이면 Loader만 렌더한다.
  - [ ] 모드 판정
    - `useParams().profileId`가 있으면 수정 모드다.
    - 없으면 신규 모드다. state는 `(useLocation().state as RouteState['/profile/new']) ?? null`로 받고 모양을 검증한다.
    - 신규 모드는 본인 프로필이 있으면 'family', 없으면 'self'로 정한다(RS-AC-2, RS-AC-4).
  - [ ] 부제목과 버튼
    - 본인 신규: "내 정보 입력", 버튼 "결과 보기", 이름 기본값 "나"
    - 가족 신규: "가족 추가", 버튼 "결과 보기"
    - 수정: "정보 수정", 버튼 "저장"
  - [ ] 가족 신규 모드에서 가족이 9명이면 disabled와 disabledReason을 넘긴다.
  - [ ] 수정 모드
    - 기존 값을 미리 채운다. 범위 밖 출생연도도 문자열 그대로 채워, 제출 시 3.1 검증 메시지가 뜨게 한다(DV-AC-2 복구 경로).
    - ready 이후 id가 없거나 존재하지 않으면 `navigate('/', { replace: true })`(RS-AC-3)
  - [ ] 저장
    - 신규는 addProfile, 수정은 updateProfile을 부른다.
    - 성공: `navigate('/', { replace: true, state: { toast: 'saved' } satisfies RouteState['/'] })`
    - DUPLICATE_NAME: nameError "이미 같은 이름의 프로필이 있어요"
    - STORAGE_FULL: Toast "저장 공간이 부족해 저장하지 못했어요", navigate 0회, 입력값 유지
  - [ ] 삭제
    - 수정 모드이고 role이 'family'일 때만 DeleteProfileButton을 렌더한다.
    - onConfirm → deleteProfile → `navigate('/', { replace: true, state: { toast: 'deleted' } })`
  - [ ] 테스트
    - F3-AC1: "나"/1986/남성/사무직 → role self 저장, navigate 인자 일치, logClick 1회
    - F3-AC4: "엄마" 중복 문구
    - F3-AC6: 프리필, 잘못된 id 이동, Loader
    - F3-AC7: Toast, 값 유지
    - F8-AC1: 1986 → 1987 저장 → navigate state saved
    - F8-AC2: 확인 → 프로필·기록 삭제, navigate deleted. 취소 → 변화 없음
    - F8-AC3: self 수정 화면에 "삭제" 0개
    - RS-AC-2: state 없이 렌더해도 에러 없음
    - RS-AC-4: `{ mode: 1 }`이면 추론 모드
    - DV-AC-2: store mock으로 self.birthYear 1900 → 출생연도 "1900"이 프리필되고, 제출하면 "1920~2026년 사이로 입력해주세요"가 뜨고 저장 0회
- Covers: [F3-AC1, F3-AC4, F3-AC6, F3-AC7, F8-AC1 (폼), F8-AC2, F8-AC3, RS-AC-2, RS-AC-3, RS-AC-4, DV-AC-2 (복구 폼)]
- Files: [src/pages/ProfileFormPage.tsx, src/pages/ProfileFormPage.test.tsx]
- Depends on: Task 2.4, Task 3.1, Task 3.2

### Task 3.4 홈 부트스트랩 훅 — useHomeBootstrap
- Description: 홈의 로딩, 리다이렉트, 토스트, 결과 계산을 맡습니다. 렌더는 4.1이 합니다.
- DoD:
  - [ ] 반환값: `{ phase: 'loading' | 'redirecting' | 'ready', selfResult, self, family, familyResults: Record<string, ProfileResult | null>, toast: string | null, clearToast }`
  - [ ] status가 'loading'이면 phase는 'loading'이고 navigate는 0회다.
  - [ ] ready인데 self가 없으면 `navigate('/profile/new', { replace: true, state: { mode: 'self' } satisfies RouteState['/profile/new'] })`를 부르고 phase는 'redirecting'이다.
  - [ ] ready이고 self가 있는데 `isEvaluable(self, 올해)`가 false이면
    - `navigate('/profile/' + self.id + '/edit', { replace: true })`를 부른다.
    - phase는 'redirecting'이고 selfResult는 null이다(DV-AC-2).
  - [ ] state는 RS 패턴으로 받고 모양을 검증한다.
    - 'saved' → toast "저장했어요"
    - 'deleted' → toast "삭제했어요"
    - 직후 `navigate('.', { replace: true, state: null })`를 부른다.
    - useRef로 StrictMode에서도 1회만 처리한다.
  - [ ] recovered가 true이면 리다이렉트보다 먼저 toast "저장된 정보를 불러오지 못해 새로 시작해요"를 정하고 ackRecovered()를 부른다.
  - [ ] 결과 계산
    - `evaluateAll(profiles, records, new Date())`를 useMemo로 계산한다.
    - 결과가 없는 가족은 `familyResults[id] = null`로 둔다.
    - 이 훅 안에서 `evaluateProfile`을 직접 호출하지 않는다(throw 경로 차단).
  - [ ] 테스트(renderHook + renderWithProviders)
    - F4-AC4: loading
    - F4-AC5: navigate 인자 일치
    - F4-AC6: toast 1회, state 비우기, 재렌더해도 미재발
    - F2-AC4·DV-AC-1: 복구 토스트
    - DV-AC-2: useCheckupStore를 mock해 self.birthYear 1900 → throw 없음, edit 경로 navigate. 가족 birthYear 1900 → familyResults[id] === null, phase 'ready'
    - RS-AC-1: state 없이도 에러 없음
    - RS-AC-4: `{ toast: 'xyz' }` → toast null
- Covers: [F4-AC4, F4-AC5, F4-AC6, F2-AC4 (토스트), DV-AC-1, DV-AC-2, RS-AC-1, RS-AC-4]
- Files: [src/pages/home/useHomeBootstrap.ts, src/pages/home/useHomeBootstrap.test.tsx]
- Depends on: Task 1.4, Task 2.4

### Task 3.5 항목 행 — CheckupItemRow (Switch·조건부 시트)
- Description: 검진 항목 하나를 ListRow로 보여 줍니다. Switch 여부와 설명은 1.5의 `canToggle`·`itemDescription`만 씁니다. 본인 화면과 가족 시트가 함께 씁니다.
- DoD:
  - [ ] props: `{ profileId, status: ItemStatus, year, eligibleCount }`. 루트는 `data-testid="checkup-item-{itemId}"`다.
  - [ ] 설명은 `itemDescription(status, eligibleCount)`이다. conditional이면 Badge "조건부"를 붙인다.
  - [ ] Switch
    - `canToggle(status, eligibleCount)`가 true일 때만 Switch("받았어요", checked = received)를 렌더한다.
    - 탭하면 `logClick('checkup_received_toggle')`을 기록하고 toggleRecord를 부른다.
    - OFF → ON일 때만 `requestReviewOnce()`를 부른다.
    - ok:false이면 이전 상태로 롤백하고 Toast "저장하지 못했어요. 다시 시도해주세요"를 띄운다.
  - [ ] 조건부 시트(TT-AC-3)
    - conditional 행은 ListRow의 onClick으로 BottomSheet를 연다. 탭 영역은 행 전체다.
    - Switch 클릭은 `stopPropagation`으로 시트를 열지 않는다.
    - 시트에는 conditionText와 "출처: {rule.source}"를 표시한다.
  - [ ] ListRow·Switch에 style·className으로 크기·여백을 지정하지 않는다.
  - [ ] 테스트
    - F5-AC1: ON → `{ general, 2026 }` 저장, 설명 "받았어요 · 다음 대상 2028년", logClick 1회
    - F5-AC3: OFF → 삭제, "올해 대상 · 12월 31일까지"
    - F5-AC4: STORAGE_FULL → 롤백, Toast
    - F5-AC5: 비대상 → Switch 0, "다음 대상 2036년"
    - CS-AC-1: liver(eligibleThisYear true, conditional) + eligibleCount 0 → Switch 0, "조건부" Badge 1, 설명 "조건에 해당하면 올해 대상"
    - CS-AC-2: 같은 liver + eligibleCount 2 → Switch 1
    - F5-AC6: 템플릿 requestReviewOnce 안의 SDK 호출만 mock. ON → OFF → ON 동안 SDK 1회, OFF 탭에서 requestReviewOnce 0회
    - F4-AC7: 간암 시트 문구 2개, "출처: 암관리법 시행령 별표1"
    - TT-AC-3: 라벨 텍스트 탭 → 시트 열림. Badge 탭 → 시트 열림. Switch 탭 → 시트 0회
    - 루트 ListRow에 `style` 속성 없음
- Covers: [F5-AC1, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F4-AC7 (조건부 시트), CS-AC-1, CS-AC-2 (행), TT-AC-3]
- Files: [src/components/home/CheckupItemRow.tsx, src/components/home/CheckupItemRow.test.tsx]
- Depends on: Task 1.5, Task 2.4

### Task 3.6 무료 층 — FreeTier (히어로·체크리스트·빈 상태·고지·공유)
- Description: 본인 결과 블록입니다. 이 블록만으로 앱의 목적이 달성됩니다. 배치는 4.1에서 합니다.
- DoD:
  - [ ] props: `{ result: ProfileResult; profileId }`. 루트는 `data-testid="free-tier"`이고, 첫 렌더 때 `logImpression('result_free_tier')`를 1회 기록한다.
  - [ ] eligibleCount > 0일 때 SummaryHero(`data-testid="summary-hero"`)
    - CountUp 값: eligibleCount
    - 제목 "올해 대상 N개", 보조값 "D-{daysLeft}"
    - MiniBar: received / eligible
    - 전부 수검이면 "올해 검진 완료 · 다음 검진 {Y}년"
  - [ ] eligibleCount = 0일 때
    - SummaryHero 대신 Asset.ContentIcon, "올해는 받을 국가검진이 없어요", "다음 대상: {Y}년"을 표시한다.
    - "D-" 문구는 0건이다.
  - [ ] 항목 목록
    - eligibleCount와 관계없이 Card 안에 items 전부를 순서대로 CheckupItemRow로 렌더한다.
    - `eligibleCount={result.eligibleCount}`를 넘긴다.
    - Switch 여부는 CheckupItemRow가 정한다.
  - [ ] Paragraph.Text "정확한 대상 여부는 국민건강보험공단 안내를 확인하세요"를 항상 표시한다.
  - [ ] Button "결과 공유하기"(display="block")
    - 탭하면 shareApp() 1회와 `logClick('share_result')`
  - [ ] 테스트(2026-10-10)
    - F4-AC1: 1986·male·office → general·stomach 행, "조건부" liver 행, "올해 대상 2개", "D-82"
    - F4-AC2: testid 3개, colorectal "다음 대상 2036년", MiniBar 0/2
    - CS-AC-2: 1986·male·office → free-tier 안 Switch 3개
    - F4-AC3: 1987·female·regional_head → 빈 상태, Switch 0, "D-" 0
    - CS-AC-1: 1985·male·office, 기록 없음 → 빈 상태 문구, "다음 대상: 2027년", liver 행 "조건에 해당하면 올해 대상", Switch 0, "D-" 0, summary-hero 0
    - F5-AC1: 체크 1개 → MiniBar 1/2
    - F5-AC2: 둘 다 ON → "올해 검진 완료 · 다음 검진 2028년"
    - F5-AC3: 해제 → 0/2
    - F5-AC5: 대상 0개 → Switch 0
    - F5-AC7: 공유
    - F5-AC8: 1985·male·office + {general, 2025} → 빈 상태 표시, general 설명 "다음 대상 2027년", Switch 0, `result.receivedCount === 0`
    - Button "결과 공유하기"에 `style` 속성 없음
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC7 (고지), F5-AC1, F5-AC2, F5-AC3, F5-AC5, F5-AC7, F5-AC8, F7-AC1 (무료 층 내용), CS-AC-1, CS-AC-2]
- Files: [src/components/home/FreeTier.tsx, src/components/home/FreeTier.test.tsx]
- Depends on: Task 3.5

### Task 3.7 마감 배너 — DeadlineBanner
- Description: 하반기에 아직 받지 않은 대상 검진이 있을 때 띄우는 배너입니다. bannerView 결과만 렌더합니다.
- DoD:
  - [ ] status가 'loading'이거나 bannerView가 null이면 아무것도 렌더하지 않는다.
  - [ ] 표시 구성
    - `Card`(`data-testid="deadline-banner"`) 안에 title·body Paragraph.Text
    - urgent이면 Badge "마감 임박"과 urgentText
    - Button "닫기"
  - [ ] 노출되면 `logImpression('deadline_banner')`를 1회 기록한다.
  - [ ] "닫기"를 누르면 `dismissBanner(monthKey(today))`를 부르고 배너가 바로 사라진다.
  - [ ] 테스트
    - F6-AC1: 문구 2개, impression 1회
    - F6-AC2: 6/30 미표시, 7/1 "D-183"
    - F6-AC3: urgent
    - F6-AC4: 전부 수검하면 즉시 사라짐, 대상 0개 미표시
    - CS-AC-1: 1985·office → 미표시
    - F6-AC5: 닫기 저장, 11/1 재표시
    - F6-AC6: 손상 키여도 표시, loading이면 미표시
- Covers: [F6-AC1 ~ F6-AC6, CS-AC-1 (배너)]
- Files: [src/components/home/DeadlineBanner.tsx, src/components/home/DeadlineBanner.test.tsx]
- Depends on: Task 1.5, Task 2.4

### Task 3.8 가족 체크리스트 시트 — FamilyChecklistSheet
- Description: 가족 한 명의 올해 항목을 보여 주는 BottomSheet입니다. 새 라우트는 만들지 않습니다. 3.9가 import합니다.
- DoD:
  - [ ] props: `{ profileId: string | null; onClose }`
    - profileId가 null이거나, store에 없거나, `evaluateAll` 결과에 없으면(출생연도 오류) 시트는 닫힌 상태이고 크래시하지 않는다.
  - [ ] 그 가족의 items를 CheckupItemRow(`eligibleCount={result.eligibleCount}`)로 렌더한다. Switch는 가족 profileId로 저장한다.
  - [ ] Button "정보 수정"을 누르면 `navigate('/profile/' + profileId + '/edit')`를 state 없이 부른다.
  - [ ] 테스트(F7-AC6), 엄마 1966·female·dependent
    - 행 7개, "조건부" Badge 2개, Switch 7개(eligibleCount 5라 조건부도 Switch)
    - general ON → 엄마 profileId로 저장
    - navigate 인자 일치
  - [ ] 테스트: 존재하지 않는 id → 크래시 없음, 시트 닫힘
- Covers: [F7-AC6, CS-AC-2 (가족)]
- Files: [src/components/home/FamilyChecklistSheet.tsx, src/components/home/FamilyChecklistSheet.test.tsx]
- Depends on: Task 3.5

### Task 3.9 잠금 층 — LockedTier (3개년 계획표·가족 결과) + FamilyTeaser
> 착수 전 확인: §5-B(가족 이름의 게이트 밖 노출). 확인 전에는 SPEC F7-AC4대로 구현합니다. 결정이 바뀌면 `FamilyTeaser.tsx`와 이 Task의 F7-AC4 테스트, 4.1의 F7-AC4 테스트만 바뀝니다.
- Description: 리워드 게이트 안에 들어갈 심화 층과 게이트 밖 가족 티저 줄입니다. 게이트 배치는 4.1에서 합니다.
- DoD:
  - [ ] LockedTier
    - props: `{ self, family, selfResult, familyResults }`
    - 루트 `data-testid="locked-tier"`
    - 마운트 때 `logImpression('reward_locked_tier')` 1회
  - [ ] 계획표
    - Card 3장(`data-testid="plan-year-{연도}"`)
    - 각 Card에 본인과 가족 전원의 formatPlanLine 행을 넣는다.
    - buildPlan이 `[]`인 프로필은 `formatPlanLine(name, null)`으로 넣는다.
  - [ ] 가족 결과 행
    - `formatFamilyRow(name, familyResults[id])`로 만든 ListRow. 비대상·오류 가족도 빼지 않는다.
    - 정상 행을 탭하면 FamilyChecklistSheet를 연다.
    - 결과가 null인 행을 탭하면 `navigate('/profile/' + id + '/edit')`를 부른다.
  - [ ] 가족 0명이면 본인만 있는 Card 3장, Asset.ContentIcon, "가족을 추가하면 함께 볼 수 있어요"를 표시한다.
  - [ ] Button "가족 추가"
    - `logClick('family_add')`
    - `navigate('/profile/new', { state: { mode: 'family' } satisfies RouteState['/profile/new'] })`
  - [ ] FamilyTeaser(ListRow)
    - 가족이 있으면 "등록한 가족: 엄마 · 아빠"
    - 0명이면 "가족을 추가해 함께 확인해요"
  - [ ] ListRow·Button에 `style` 속성 없음
  - [ ] 테스트
    - F7-AC2: Card 3장, plan-year-2027 두 문구, "엄마 · 올해 대상 5개", "아빠 · 올해 대상 1개(대장암)"
    - F7-AC4: 티저 문구 2종
    - F7-AC5: 빈 상태, navigate 인자, logClick
    - F7-AC6: 엄마 행 탭 → 시트 행 7개
    - F7-AC7: "동생 · 올해 대상 없음 · 다음 2027년"
    - DV-AC-2: 가족 "삼촌" result null → "삼촌 · 출생연도를 확인해주세요" 행이 있고, 탭하면 edit navigate. 각 plan-year Card에 "삼촌 — 출생연도를 확인해주세요"가 있고 크래시 없음
- Covers: [F7-AC2, F7-AC4, F7-AC5, F7-AC6 (연결), F7-AC7, DV-AC-2 (가족 행)]
- Files: [src/components/home/LockedTier.tsx, src/components/home/FamilyTeaser.tsx, src/components/home/LockedTier.test.tsx]
- Depends on: Task 1.4, Task 3.8

### Task 3.10 하단 관리 — HomeFooterActions (내 정보 수정·기준 출처·초기화)
- Description: 홈 하단 ListRow 3개와 각 행이 여는 시트·다이얼로그입니다.
- DoD:
  - [ ] "내 정보 수정" → `navigate('/profile/' + self.id + '/edit')`
  - [ ] "검진 기준과 출처" → BottomSheet
    - CHECKUP_RULES 7행을 formatRuleSourceRow로 표시한다.
    - `a[href^="http"]`는 0개다.
  - [ ] "데이터 초기화" → AlertDialog "모든 프로필과 체크 기록을 지울까요?"
    - "초기화" → resetAll()
    - 성공 → `navigate('/profile/new', { replace: true, state: { mode: 'self' } })`
    - 실패 → Toast "초기화하지 못했어요. 다시 시도해주세요", navigate 0회
    - "취소" → 호출 없음
  - [ ] ListRow 3개에 `style` 속성 없음
  - [ ] 테스트
    - F8-AC4: 7행, 위암 행 일치, http 링크 0
    - F8-AC6: 세 키 삭제, navigate 인자
    - F8-AC7: removeItem throw → Toast, console.error 0회
    - F8-AC1: 진입 navigate 인자
- Covers: [F8-AC1 (진입), F8-AC4, F8-AC6, F8-AC7]
- Files: [src/components/home/HomeFooterActions.tsx, src/components/home/HomeFooterActions.test.tsx]
- Depends on: Task 1.2, Task 2.4

---

## Epic 4. Integration + Polish

**Risk Analysis**
- Complexity: Medium
- 위험 요인
  - 게이트가 무료 층을 감쌀 수 있습니다.
  - AdSlot이 콘텐츠와 겹칠 수 있습니다.
  - catch-all 라우트가 없으면 빈 화면이 뜹니다.
  - HEX, 외부 이동, 설치 문구가 남으면 검수에서 반려됩니다.
  - 터치 영역은 jsdom에서 측정할 수 없습니다.
  - 광고 env 없이 릴리스되면 잠금 층이 수익 없이 열립니다.
- 완화 방법
  - HomePage는 한 번만 조립하고, DOM 순서를 mock 테스트로 고정합니다.
  - 정적 검사(4.3)는 검사만 합니다.
  - 실측 QA(4.5)와 릴리스 env 검사(4.6)를 둡니다.
  - E2E(4.4)를 둡니다.

### Task 4.1 홈 조립 — HomePage
- Description: useHomeBootstrap과 블록들로 SPEC S1 순서대로 조립합니다. `<TossRewardAd>`의 자식은 잠금 층뿐입니다.
- DoD:
  - [ ] ScreenScaffold, Top title "올해검진"
  - [ ] phase별 렌더
    - 'loading': Loader 1개만
    - 'redirecting': null
  - [ ] toast가 있으면 TDS Toast로 표시하고 clearToast를 부른다.
  - [ ] ready일 때 DOM 순서
    1. DeadlineBanner
    2. FreeTier
    3. `AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID}`
    4. FamilyTeaser
    5. `TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}`의 자식으로 LockedTier
    6. HomeFooterActions
  - [ ] 블록 사이 간격은 Spacing size로만 준다. AdSlot 주변에 position absolute·fixed를 쓰지 않는다.
  - [ ] 테스트(TossRewardAd mock이 children을 캡처해 렌더)
    - F7-AC3: compareDocumentPosition으로 free-tier → AdSlot mock → FamilyTeaser → locked-tier 순서 확인
    - F7-AC3: 캡처한 children 안에 free-tier가 없다. `logImpression('reward_locked_tier')`가 기록된다.
    - F7-AC1: mock이 children을 렌더하지 않아도 free-tier에 "일반건강검진", "위암 검진", "D-82"가 보인다.
    - F7-AC1: env 미설정(fail-open)이면 locked-tier가 보인다.
    - F7-AC4: 티저가 게이트 밖에 있다.
    - F4-AC2: Top title "올해검진"
    - F4-AC4: loading → Loader만, summary-hero 0
    - F4-AC6: saved state → Toast "저장했어요" 1회
    - DV-AC-2: store mock으로 self.birthYear 1900 → 크래시 없음, free-tier 0, edit navigate
- Covers: [F7-AC1, F7-AC3, F7-AC4 (배치), F4-AC2 (Top), F4-AC4, F4-AC5, F4-AC6, F2-AC4 (토스트 렌더), RS-AC-1, DV-AC-2 (화면)]
- Files: [src/pages/HomePage.tsx, src/pages/HomePage.test.tsx]
- Depends on: Task 3.4, Task 3.6, Task 3.7, Task 3.9, Task 3.10

### Task 4.2 라우팅 연결 & Provider 배치
- Description: App에 라우트 3개와 catch-all을 등록하고 Provider로 감쌉니다.
- DoD:
  - [ ] 라우트
    - `/` → HomePage
    - `/profile/new` → ProfileFormPage
    - `/profile/:profileId/edit` → ProfileFormPage
    - `*` → `<Navigate to="/" replace />`
  - [ ] Provider는 Router 안쪽, Routes 바깥쪽에 1개만 둔다.
  - [ ] `App.tsx`는 `./App.css`를 import하지 않는다. 파일 자체는 0.1 소유라 지우지 않는다.
  - [ ] 통합 테스트(MemoryRouter로 App 전체)
    - 빈 저장소로 `/` → `/profile/new`, "내 정보 입력"
    - 입력 후 "결과 보기" → `/`, "저장했어요", free-tier
    - `/unknown` → `/`
    - state 없이 `/profile/new` → 정상 렌더
    - `/profile/zzz/edit` → `/`
- Covers: [F3-AC1 (종단), F4-AC5 (종단), RS-AC-1, RS-AC-2, RS-AC-3]
- Files: [src/App.tsx, src/App.test.tsx]
- Depends on: Task 3.3, Task 4.1

### Task 4.3 검수 필수 조건 정적 검사 (검사 전용 — 소스 수정 없음)
- Description: 검수 반려 조건과 TT-AC-1을 테스트로 고정합니다. 이 Task는 아래 Files 외의 파일을 만들거나 수정하지 않습니다.
- DoD:
  - [ ] 스캔 대상: `src/**/*.{ts,tsx,css}`(테스트 파일과 `src/__tests__/**` 제외)를 fs로 재귀 탐색한다. 아래 항목은 모두 0건이어야 한다.
    - `/#[0-9a-fA-F]{3,8}\b/`
    - `react-ga`, `@amplitude/`, `gtag`, `mixpanel`
    - `window.open`, `location.href\s*=`
    - "설치", "다운로드"
    - `<a href="http`
    - `randomUUID`, `structuredClone`, `Object.hasOwn`, `\.at\(`
    - `grantPromotionReward`
  - [ ] TT-AC-1 검사
    - 대상: `src/{domain,data,lib,pages,components/home}/**`, `src/App.tsx`, `src/index.css`, `src/App.css`
    - CSS 속성 `(min-|max-)?height`, `padding[-\w]*`, `margin[-\w]*`, `font-size`, `line-height` 선언 0건
    - `style=\{\{[^}]*\b(height|minHeight|maxHeight|padding\w*|margin\w*|fontSize|lineHeight)\b` 0건
  - [ ] 실패 메시지는 위반 `파일경로:줄`과, §6 표에서 찾은 소유 Task 번호를 출력한다.
    - 예: `src/components/home/FreeTier.tsx:12 → Task 3.6 재작업`
    - 템플릿 파일이면 "템플릿 — §5-E 참조"를 출력한다.
  - [ ] 소유 Task 매핑은 테스트 파일 안 상수로 둔다. §6 표와 경로가 같아야 한다.
  - [ ] 1986 본인과 가족 2명으로 홈을 렌더할 때 console.error spy 호출이 0회다.
  - [ ] 프로덕션 `npm run build`가 성공한다.
  - [ ] 위반이 나오면 이 Task는 고치지 않는다. 소유 Task를 다시 열고, 그 Task의 DoD로 수정한 뒤 이 테스트를 다시 실행한다.
- Covers: [F4-AC8, F8-AC5, F8-AC4 (전역 링크 0), TT-AC-1]
- Files: [src/__tests__/compliance.test.ts, src/__tests__/homeConsole.test.tsx]
- Depends on: Task 0.1, Task 4.2

### Task 4.4 종단 시나리오 & Value AC 검증
- Description: App 전체를 렌더해 핵심 흐름을 검증합니다. today는 2026-10-10입니다.
- DoD:
  - [ ] Value AC(F4-AC1): 1986·male·office 입력 → free-tier에 다음이 보인다.
    - "일반건강검진", "위암 검진" 대상 행
    - "조건부" "간암 검진"
    - "올해 대상 2개", "D-82"
  - [ ] F8-AC1: "내 정보 수정" → 1987 저장 → "저장했어요", "올해는 받을 국가검진이 없어요", "다음 대상: 2027년", Switch 0
  - [ ] F7-AC2: 엄마(1966·female·dependent)와 아빠(1963·male·regional_head) 추가 → fail-open 상태에서 plan-year-2027에 "아빠 — 일반건강검진·위암 검진·대장암 검진"
  - [ ] F8-AC2: 엄마 시트 → "정보 수정" → "삭제" → 확인 → "삭제했어요", 티저 "등록한 가족: 아빠"
  - [ ] DV-AC-1: localStorage에 birthYear 1900 프로필을 심고 `/` 진입 → Toast "저장된 정보를 불러오지 못해 새로 시작해요" 1회, "내 정보 입력", `checkupWindow.profiles.v1.corrupt`에 원본
  - [ ] RS-AC-1: 홈을 state 없이 다시 마운트 → 토스트 0회, 크래시 없음
- Covers: [F4-AC1, F8-AC1, F7-AC2, F8-AC2, DV-AC-1, RS-AC-1]
- Files: [src/__tests__/e2e.flow.test.tsx]
- Depends on: Task 4.2

### Task 4.5 터치 영역 실측 QA (TT-AC-2)
- Description: jsdom은 레이아웃을 계산하지 못해 44px을 자동 테스트로 확인할 수 없습니다. 실제 렌더 환경에서 재고 결과를 기록합니다. 소스 파일은 수정하지 않습니다.
- DoD:
  - [ ] 측정 환경
    - `npm run dev`
    - Chrome DevTools Device Mode 360×740
    - 라이트·다크 각 1회
  - [ ] `docs/qa/touch-targets.md`에 표를 작성한다. 컬럼: 화면 | 요소 | 측정 높이(px) | 통과 여부. 행은 다음 전부다.
    - S2: 가입 유형 ListRow 5개, SubmitFooter 버튼, "삭제" 버튼
    - S1: checkup-item 행(general·stomach·liver), Switch 클릭 요소(`getBoundingClientRect().height`), "결과 공유하기", 배너 "닫기", 가족 티저, 가족 결과 행, "가족 추가", 하단 ListRow 3개
    - 가족 시트: "정보 수정"
  - [ ] 통과 조건: 모든 행의 측정 높이가 ≥ 44다.
  - [ ] 44 미만인 행이 있으면
    - 앱 쪽 덮어쓰기 때문이면 해당 소유 Task를 재작업한다.
    - TDS 기본값 자체가 44 미만이면 여백을 덮어쓰지 않는다. §5 "빌드 전 확인 필요"에 요소명과 측정값을 올린다.
- Covers: [TT-AC-2, F3-AC8 (터치 영역), SPEC S1 터치 요구]
- Files: [docs/qa/touch-targets.md]
- Depends on: Task 4.2

### Task 4.6 릴리스 광고 env 검사 (REL-AC-1·2)
- Description: Vite는 `import.meta.env.VITE_*`를 빌드 시점에 인라인합니다. 슬롯 ID 없이 빌드하면 게이트가 fail-open이 되고 잠금 층 수익이 0이 됩니다. 릴리스 빌드는 두 값이 없으면 실패하게 합니다. 개발 빌드(`npm run build`)는 fail-open 그대로 둡니다.
- DoD:
  - [ ] `.env.example`
    - `VITE_TOSS_AD_SLOT_ID=`와 `VITE_TOSS_AD_GROUP_ID=`를 빈 값으로 둔다.
    - 주석: "앱인토스 콘솔에서 발급. 값이 바뀌면 재빌드·재배포 필요"
    - 실제 ID는 커밋하지 않는다.
  - [ ] `scripts/check-release-env.mjs`
    - `--env` 모드
      - `loadEnv('production', process.cwd(), 'VITE_')`(vite)로 `.env.production*`와 process env를 병합한다.
      - 두 키 중 하나라도 비어 있으면 "{변수명}가 비어 있어요"를 출력하고 exit 1, 둘 다 있으면 exit 0
    - `--dist <dir>` 모드
      - `<dir>/assets/*.js` 전체에 두 값이 모두 문자열로 들어 있으면 exit 0, 아니면 exit 1
  - [ ] `package.json`에 scripts `"build:release": "node scripts/check-release-env.mjs --env && npm run build && node scripts/check-release-env.mjs --dist dist"`만 추가한다. 다른 필드는 수정하지 않는다.
  - [ ] 테스트(child_process로 스크립트 실행, .env 파일이 없는 임시 cwd)
    - 두 값 없음 → exit 1, 메시지에 "VITE_TOSS_AD_SLOT_ID가 비어 있어요"
    - SLOT만 있음 → exit 1, "VITE_TOSS_AD_GROUP_ID가 비어 있어요"
    - 둘 다 `test-slot-1`/`test-group-1` → exit 0
    - `--dist` 임시 폴더의 js에 두 값 포함 → 0, 하나 누락 → 1
- Covers: [REL-AC-1, REL-AC-2, F7 수익 전제(PRD 목표 5)]
- Files: [.env.example, scripts/check-release-env.mjs, src/__tests__/releaseEnv.test.ts, package.json]
- Depends on: Task 4.1

---

## TASK 단계 설계 결정 (SPEC이 정하지 않은 부분 — 리뷰 필요)
1. 12월 31일 당일 배너는 "D-0"과 "마감 0일 전이에요"를 보여 줍니다.
2. **(변경) 조건부 항목만 대상인 해의 규칙**
   - "대상 0개"는 SPEC의 `eligibleCount` 정의(조건부 제외)를 그대로 따릅니다.
   - 이때 화면은 빈 상태 문구와 항목 목록을 함께 보여 줍니다. 조건부 행에는 Switch를 두지 않습니다(`canToggle`).
   - 조건부 행 설명은 "조건에 해당하면 올해 대상"입니다. 새 문구라 검토가 필요합니다.
   - eligibleCount > 0인 해에는 조건부 행에도 Switch가 있습니다(SPEC F7-AC6의 엄마 시트와 일치).
   - 근거: 빈 상태 "올해는 받을 국가검진이 없어요" 옆에 "받았어요" Switch가 있으면 메시지가 서로 충돌합니다. SPEC F5-AC5의 문자 그대로("대상 0개면 Switch 0")와도 일치합니다.
   - 한계: 그해 조건부 대상자(예: 1985년생 간질환자)는 간암 수검을 체크할 수 없습니다. 조건부 항목은 원래 집계에서 빠지므로 결과 숫자에는 영향이 없습니다.
3. 계획표 행에 대상이 없으면 `"{이름} — 대상 없음"`으로 표시합니다. 등록한 프로필을 숨기지 않습니다.
4. 가족 결과 행의 괄호 표기는 대상이 1개일 때만 붙입니다(SPEC 예시 2건에서 추론).
5. 사무직과 지역세대주의 "2년마다 대상이에요"는 CheckupRule 격년 규칙에서 가져왔습니다.
6. 하한 미달 reason은 `"{Y}년 대상(만 {min}세부터)"`입니다.
7. 초기화 실패도 `STORAGE_FULL`로 반환합니다. UI는 이 코드로 분기하지 않습니다.
8. 이름 비교는 trim 후 합니다.
9. **(신규) 읽기 검증 실패는 엔벨로프 단위로 손상 처리합니다.**
   - 범위 밖 출생연도 프로필이 1개라도 있으면 목록 전체를 `.corrupt`에 보관하고 새로 시작합니다. SPEC F2-AC4의 기존 손상 경로와 토스트를 재사용하려는 것입니다.
   - 기기 시계가 과거로 돌아가 birthYear > 올해가 되면 같은 처리가 일어납니다. 원본은 `.corrupt`에 남습니다.
   - 저장소를 우회한 경우의 방어는 DV-AC-2입니다.
10. **(신규) 오류 행 문구** "{이름} · 출생연도를 확인해주세요"와 "{이름} — 출생연도를 확인해주세요"는 새 문구입니다. 등록한 프로필이 결과 화면에서 사라지지 않게 하려는 것입니다.
11. **(신규) 조건부 시트 트리거**는 Badge가 아니라 ListRow 전체입니다. Badge를 탭해도 열리므로 SPEC F4-AC7을 만족하고, 44px 탭 영역도 확보합니다.
12. 가족 시트 안의 조건부 행을 탭하면 BottomSheet 위에 BottomSheet가 열립니다. TDS가 중첩 시트를 지원하지 않으면 4.5 QA에서 발견하는 대로 §5에 올립니다.

---

## 5. 빌드 전 확인 필요 (TASK 범위 밖 — 담당자 결정)

**A. PRD 수익 공식 오류 (PRD 담당자)**
- `15 × 0.2 × 30 × 30.128원/1,000 × 0.85` ≈ 2.3원이라 PRD의 2,305원과 맞지 않습니다.
- 공식 문구를 고치거나 단가 단위(노출당/1,000회당)를 정정해야 합니다.
- 올바른 단가는 TASK에서 지어내지 않습니다. 이 값에 의존하는 Task는 없습니다.

**B. 가족 이름의 게이트 밖 노출 (PRD 기능 4 ↔ SPEC F7-AC4·OQ6) — 3.9 착수 전**
- 기본 동작: SPEC F7-AC4대로 이름만 게이트 밖 티저에 표시합니다. 가족별 결과·계획표는 게이트 안에 둡니다.
- 근거: 사용자 맞춤 규칙에 따라 "등록한 것은 결과 화면에 자기 이름으로 나타나야" 합니다. 게이트가 닫혀 있을 때도 등록한 가족이 보여야 합니다.
- PRD 쪽 결정이 "이름도 게이트 뒤"이면 수정 범위는 `FamilyTeaser.tsx`, 3.9·4.1·4.4의 F7-AC4 관련 단언입니다.

**C. SPEC 반영 요청**
- 결정 2(조건부 Switch 규칙)와 DV-AC-1·2를 SPEC F5-AC5와 F2-AC4에 AC로 추가해 주세요.

**D. 신규 문구 검토**
- "조건에 해당하면 올해 대상"
- "출생연도를 확인해주세요"

**E. 템플릿 파일의 HEX·여백**
- 0.1 기준선에서 템플릿 컴포넌트에 HEX가 나오면 앱 Task 권한으로 고칠 수 없습니다. 템플릿 담당자의 수정이 필요하며, 수정 전까지 4.3은 실패 상태로 남습니다.

**F. TDS 기본 터치 영역**
- 4.5에서 TDS 기본값 자체가 44px 미만으로 측정되면 여백 덮어쓰기는 검수 반려 사유입니다. TDS·검수 담당자에게 확인해야 합니다.

**G. 광고 ID 발급**
- `VITE_TOSS_AD_SLOT_ID`·`VITE_TOSS_AD_GROUP_ID`는 앱인토스 콘솔에서 발급받아 릴리스 환경에 설정해야 합니다. 없으면 4.6의 `build:release`가 실패합니다(의도된 차단).

**H. 참고: 검진 예약은 앱 밖 행동입니다**
- SPEC이 외부 링크와 설치 유도를 금지하므로, PRD의 "연말 전 예약"은 사용자가 직접 하는 행동으로만 달성됩니다. 앱은 대상 항목과 D-day 제공까지 맡습니다. 추가 Task는 없습니다.

**I. SPEC Open Questions 1~7은 그대로 유효합니다.**
- 2번(폐암 조건 문구)과 3번(배너 문구)은 `rules.ts`와 `banner.ts` 상수만 바꾸면 반영됩니다.

---

## AC Coverage
- Total ACs in SPEC: 60 (F1 8, F2 8, F3 8, F4 8, F5 8, F6 6, F7 7, F8 7)
- Covered by tasks: 60

| AC | Tasks |
|---|---|
| F1-AC1 ~ F1-AC7 | 1.3 |
| F1-AC8 | 1.4 |
| F2-AC1, F2-AC3, F2-AC6, F2-AC8 | 2.2 |
| F2-AC2 | 2.3 |
| F2-AC4 | 2.1, 2.4, 3.4, 4.1 |
| F2-AC5 | 2.1, 2.2, 2.4 |
| F2-AC7 | 2.4 |
| F3-AC1 | 3.3, 4.2 |
| F3-AC2, F3-AC3, F3-AC5 | 3.1 |
| F3-AC4 | 3.1, 3.3 |
| F3-AC6, F3-AC7 | 3.3 |
| F3-AC8 | 1.2, 3.1, 4.3, 4.5 |
| F4-AC1 (Value AC) | 3.6, 4.4 |
| F4-AC2 | 3.6, 4.1 |
| F4-AC3 | 1.5, 3.6 |
| F4-AC4, F4-AC6 | 3.4, 4.1 |
| F4-AC5 | 3.4, 4.1, 4.2 |
| F4-AC7 | 3.5, 3.6 |
| F4-AC8 | 0.1, 4.3 |
| F5-AC1, F5-AC3 | 1.5, 3.5, 3.6 |
| F5-AC2 | 1.5, 3.6 |
| F5-AC4, F5-AC6 | 3.5 |
| F5-AC5 | 1.5, 3.5, 3.6 |
| F5-AC7 | 3.6 |
| F5-AC8 | 1.3, 3.6 |
| F6-AC1 ~ F6-AC4 | 1.5, 3.7 |
| F6-AC5 | 1.5, 2.3, 3.7 |
| F6-AC6 | 2.1, 3.7 |
| F7-AC1 | 3.6, 4.1 |
| F7-AC2 | 1.4, 3.9, 4.4 |
| F7-AC3 | 4.1 |
| F7-AC4 | 3.9, 4.1 |
| F7-AC5 | 3.9 |
| F7-AC6 | 3.8, 3.9 |
| F7-AC7 | 1.4, 3.9 |
| F8-AC1 | 3.3, 3.10, 4.4 |
| F8-AC2 | 3.2, 3.3, 4.4 |
| F8-AC3 | 3.3 |
| F8-AC4 | 1.2, 3.10, 4.3 |
| F8-AC5 | 4.3 |
| F8-AC6, F8-AC7 | 2.3, 3.10 |
| SPEC S1 터치 ≥44px (화면 요구) | 3.1, 3.5, 4.3, 4.5 |

**추가 수용 기준 (§0-A)**

| AC | Tasks |
|---|---|
| RS-AC-1 | 3.4, 4.1, 4.2, 4.4 |
| RS-AC-2 | 3.3, 4.2 |
| RS-AC-3 | 3.3, 4.2 |
| RS-AC-4 | 3.3, 3.4 |
| CS-AC-1 | 1.3, 1.5, 3.5, 3.6, 3.7 |
| CS-AC-2 | 1.5, 3.5, 3.6, 3.8 |
| DV-AC-1 | 2.1, 2.4, 3.4, 4.4 |
| DV-AC-2 | 1.3, 1.4, 3.3, 3.4, 3.9, 4.1 |
| TT-AC-1 | 0.1, 4.3 |
| TT-AC-2 | 4.5 |
| TT-AC-3 | 3.5 |
| REL-AC-1, REL-AC-2 | 4.6 |

- Uncovered: 0

## 6. File Ownership (파일 충돌 0 — 4.3 소유 매핑의 원본)

| 파일 | 소유 Task |
|---|---|
| src/index.css, src/App.css, docs/qa/compliance-baseline.md | 0.1 |
| src/lib/types.ts | 1.1 |
| src/domain/rules.ts, rules.test.ts | 1.2 |
| src/domain/checkup.ts, checkup.test.ts | 1.3 |
| src/domain/plan.ts, plan.test.ts | 1.4 |
| src/domain/format.ts, banner.ts, format.test.ts, banner.test.ts | 1.5 |
| src/data/storage.ts, storage.test.ts | 2.1 |
| src/data/profileRepo.ts, profileRepo.test.ts | 2.2 |
| src/data/recordRepo.ts, recordRepo.test.ts | 2.3 |
| src/data/CheckupStoreProvider.tsx, useCheckupStore.ts, CheckupStoreProvider.test.tsx, src/test/renderWithProviders.tsx | 2.4 |
| src/pages/profileForm/validate.ts, validate.test.ts, ProfileFormFields.tsx, ProfileFormFields.test.tsx | 3.1 |
| src/pages/profileForm/DeleteProfileButton.tsx, DeleteProfileButton.test.tsx | 3.2 |
| src/pages/ProfileFormPage.tsx, ProfileFormPage.test.tsx | 3.3 |
| src/pages/home/useHomeBootstrap.ts, useHomeBootstrap.test.tsx | 3.4 |
| src/components/home/CheckupItemRow.tsx, CheckupItemRow.test.tsx | 3.5 |
| src/components/home/FreeTier.tsx, FreeTier.test.tsx | 3.6 |
| src/components/home/DeadlineBanner.tsx, DeadlineBanner.test.tsx | 3.7 |
| src/components/home/FamilyChecklistSheet.tsx, FamilyChecklistSheet.test.tsx | 3.8 |
| src/components/home/LockedTier.tsx, FamilyTeaser.tsx, LockedTier.test.tsx | 3.9 |
| src/components/home/HomeFooterActions.tsx, HomeFooterActions.test.tsx | 3.10 |
| src/pages/HomePage.tsx, HomePage.test.tsx | 4.1 |
| src/App.tsx, src/App.test.tsx | 4.2 |
| src/__tests__/compliance.test.ts, src/__tests__/homeConsole.test.tsx | 4.3 |
| src/__tests__/e2e.flow.test.tsx | 4.4 |
| docs/qa/touch-targets.md | 4.5 |
| .env.example, scripts/check-release-env.mjs, src/__tests__/releaseEnv.test.ts, package.json | 4.6 |
| 템플릿 제공 파일(main.tsx, ScreenScaffold, SubmitFooter, Card, SummaryHero, MiniBar, AdSlot, TossRewardAd, 로그·공유·리뷰 유틸, FloatingTabBar) | 소유 Task 없음 — 수정 금지. 위반은 §5-E로 보고 |

- 의존 순서: Epic 0 → 1 → 2 → 3 → 4. 모든 `Depends on`은 앞선 Task를 가리킵니다.
- 4.3은 0.1과 4.2(전체 UI 체인 포함)에 의존하므로, 검사하는 모든 앱 소스 파일이 그보다 먼저 완성됩니다.