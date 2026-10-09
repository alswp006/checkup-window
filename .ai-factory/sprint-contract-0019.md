# Sprint Contract — 패킷 0019
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

## Sprint Contract: 라우팅 연결 + 전역 Provider 배선 + 종단 시나리오

**만들 항목**
- `src/App.tsx`: `CheckupStoreProvider`로 전체를 감싸고, 라우트 `/`(Home), `/profile/new`·`/profile/:profileId/edit`(ProfileForm), `*`→`<Navigate to="/" />`를 등록. 전역 Provider 배선은 이 파일에서만 수행.
- `src/App.test.tsx`: 라우트 매핑, `*` 리다이렉트, `/profile//edit`·`/unknown` 진입 시 `/`로 이동 검증.
- `src/__tests__/e2e.flow.test.tsx`: 아래 시나리오 E2E 검증 (빈 저장소 입력→결과, 수정, 가족 추가/삭제, 손상 복구).

**사용할 타입** (`src/lib/types.ts`에서 import만 수행, 재정의 금지)
`Profile`, `CheckupRecord`, `BannerState`, `ProfileResult`, `ItemStatus`, `Sex`, `InsuranceType`, `CheckupItemId`, `CheckupRule`

**검증 방법**
1. 빈 저장소 '/' → `/profile/new` 이동. '나'·1986·남성·직장가입자(사무직) 제출 후 홈(2026-10-10 고정)에 '일반건강검진', '위암 검진', 조건부 '간암 검진', '올해 대상 2개', 'D-82' 표시.
2. '내 정보 수정'에서 출생연도 1987 저장 → Toast '저장했어요', '올해는 받을 국가검진이 없어요', '다음 대상: 2027년' 표시.
3. 엄마·아빠 추가 → locked-tier(TossRewardAd fail-open)에 plan-year 3장, '엄마 · 올해 대상 5개' 표시. 엄마 삭제 → Toast '삭제했어요', 엄마 행 0개.
4. `profiles.v1`='{oops'로 '/' 진입 → Toast '저장된 정보를 불러오지 못해 새로 시작해요', `/profile/new` 이동. `/profile//edit`, `/unknown` 직접 진입 → 크래시 없이 '/' 이동.
5. 프로덕션 모드 1986 시드로 홈 렌더 중 `console.error` spy 호출 0회 단언.

**절대 하면 안 되는 것**
- `src/main.tsx` 수정 금지 (@AI:ANCHOR).
- `src/App.tsx`를 files에 포함하는 패킷은 이 패킷 하나뿐이므로, 다른 패킷에서 App.tsx 수정 금지.
- 라우트·Provider 외 비즈니스 로직(판정·계산·저장 로직) 추가 금지. 계산은 기존 모듈 사용.
- 공유 타입 재정의·변형 금지, `types.ts` 수정 금지.
- 날짜를 실제 시계에 의존시키지 말 것(2026-10-10 고정 주입).
- `console.error`를 억제·mock으로 숨겨 0회를 만들지 말 것. 실제 발생 여부로 판정.
