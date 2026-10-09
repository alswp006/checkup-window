# 터치 영역 실측 — S1 홈 · S2 프로필 입력·수정

기준: 모든 상호작용 요소의 터치 높이 **44px 이상**(SPEC S1 "터치", F2 가입 유형 ListRow ≥ 44px).
jsdom은 레이아웃을 계산하지 않으므로 자동 테스트로 대체하지 않는다. 이 표가 실측 기록이다.

## 측정 조건

- 1차 측정: 2026-10-10, Playwright Chromium(모바일 폭 뷰포트 **360×900**, **420×900**), `getBoundingClientRect().height`.
  같은 레이아웃 엔진(Blink)이지만 실기기가 아니다 — **"실기기" 칸은 토스 앱 QR 테스트에서 채운다.**
- 시드 데이터: 본인 1980년생 여성 직장가입자(사무직), 가족 "엄마" 1956년생 여성 피부양자, 수검 기록 없음.
  오늘 2026-10-10 → 마감 배너 표시, 간암·폐암 조건부 항목 표시.
- 측정 대상은 실제로 탭하는 요소다. Switch는 TDS가 렌더하는 `label[role=switch]`(내부 checkbox는 0×0),
  ListRow는 `onClick`이 있는 `li[role=button]`, 시트·다이얼로그는 열린 상태에서 잰다.
- 판정은 360·420 중 **작은 값**으로 한다.

## S1 홈 (`/`)

| 화면 | 요소 | 위치 · 라벨 | 높이 360px | 높이 420px | 통과(≥44px) | 실기기 | 소유 패킷 |
|---|---|---|---|---|---|---|---|
| S1 | Button (size small) | 마감 배너 "닫기" | 32px | 32px | ❌ 미달 | | 0015 DeadlineBanner |
| S1 | Switch "받았어요" | 체크리스트 항목 우측(항목별 1개) | 30px (폭 50px) | 30px (폭 50px) | ❌ 미달 | | 0013 CheckupItemRow |
| S1 | ListRow (조건부 항목, 시트 열기) | "간암 검진 · 조건부" | 87.4px | 67.2px | ✅ 통과 | | 0013 CheckupItemRow |
| S1 | ListRow (조건부 항목, 시트 열기) | "폐암 검진 · 조건부" | 67.2px | 67.2px | ✅ 통과 | | 0013 CheckupItemRow |
| S1 | Button display="block" | "결과 공유하기" | 48px | 48px | ✅ 통과 | | 0014 FreeTier |
| S1 | ListRow (onClick 없음 — 탭 대상 아님) | 가족 티저 "등록한 가족: 엄마" | — | — | 해당 없음 | | 0016 FamilyTeaser |
| S1 | ListRow (가족 시트 열기) | "엄마 · 올해 대상 5개" | 46.9px | 46.9px | ✅ 통과 | | 0016 LockedTier |
| S1 | Button display="block" | "가족 추가" | 56px | 56px | ✅ 통과 | | 0016 LockedTier |
| S1 | ListRow withArrow | "내 정보 수정" | 48px | 48px | ✅ 통과 | | 0017 HomeFooterActions |
| S1 | ListRow withArrow | "검진 기준과 출처" | 48px | 48px | ✅ 통과 | | 0017 HomeFooterActions |
| S1 | ListRow | "데이터 초기화" | 46.9px | 46.9px | ✅ 통과 | | 0017 HomeFooterActions |
| S1 | BottomSheet 시트 버튼 | 조건부 항목 시트 "닫기" | 56px | 56px | ✅ 통과 | | 0013 CheckupItemRow |
| S1 | BottomSheet 시트 안 ListRow | 가족 체크리스트 시트 · 조건부 항목 행 | 87.4px | 67.2px | ✅ 통과 | | 0016 FamilyChecklistSheet |
| S1 | BottomSheet 시트 안 Switch | 가족 체크리스트 시트 · 항목별 "받았어요" | 30px (폭 50px) | 30px (폭 50px) | ❌ 미달 | | 0016 FamilyChecklistSheet |
| S1 | BottomSheet 시트 버튼 | 가족 체크리스트 시트 "정보 수정" | 56px | 56px | ✅ 통과 | | 0016 FamilyChecklistSheet |
| S1 | BottomSheet 시트 버튼 | 검진 기준과 출처 시트 "닫기" | 56px | 56px | ✅ 통과 | | 0017 HomeFooterActions |
| S1 | AlertDialog 버튼 | 초기화 확인 "닫기" | 48px | 48px | ✅ 통과 | | 0017 HomeFooterActions |
| S1 | AlertDialog 버튼 | 초기화 확인 "초기화" | 48px | 48px | ✅ 통과 | | 0017 HomeFooterActions |

## S2 프로필 입력·수정 (`/profile/new`, `/profile/:profileId/edit`)

| 화면 | 요소 | 위치 · 라벨 | 높이 360px | 높이 420px | 통과(≥44px) | 실기기 | 소유 패킷 |
|---|---|---|---|---|---|---|---|
| S2 | TextField 입력 상자 | "이름" | 37px (input 31px) | 37px (input 31px) | ❌ 미달 · 실기기 재확인 | | 0010 ProfileFormFields |
| S2 | TextField 입력 상자 | "출생연도" | 37px (input 31px) | 37px (input 31px) | ❌ 미달 · 실기기 재확인 | | 0010 ProfileFormFields |
| S2 | ChipItem | "남성" | 44px | 44px | ✅ 통과 | | 0010 ProfileFormFields |
| S2 | ChipItem | "여성" | 44px | 44px | ✅ 통과 | | 0010 ProfileFormFields |
| S2 | ListRow (가입 유형 단일 선택) | "직장가입자(사무직)" | 67.2px | 67.2px | ✅ 통과 | | 0010 ProfileFormFields |
| S2 | ListRow (가입 유형 단일 선택) | "직장가입자(비사무직)" | 67.2px | 67.2px | ✅ 통과 | | 0010 ProfileFormFields |
| S2 | ListRow (가입 유형 단일 선택) | "지역가입자 세대주" | 67.2px | 67.2px | ✅ 통과 | | 0010 ProfileFormFields |
| S2 | ListRow (가입 유형 단일 선택) | "피부양자·세대원" | 67.2px | 67.2px | ✅ 통과 | | 0010 ProfileFormFields |
| S2 | ListRow (가입 유형 단일 선택) | "의료급여수급권자" | 67.2px | 67.2px | ✅ 통과 | | 0010 ProfileFormFields |
| S2 | SubmitFooter Button | 신규 "결과 보기" / 수정 "저장" | 56px | 56px | ✅ 통과 | | 0011 ProfileForm |
| S2 | Button display="block" (danger) | 가족 수정 "삭제" | 56px | 56px | ✅ 통과 | | 0011 DeleteProfileButton |
| S2 | AlertDialog 버튼 | 삭제 확인 "닫기" | 48px | 48px | ✅ 통과 | | 0011 DeleteProfileButton |
| S2 | AlertDialog 버튼 | 삭제 확인 "삭제" | 48px | 48px | ✅ 통과 | | 0011 DeleteProfileButton |

## 미달 항목 — 재작업 요청

이 패킷(0020)은 소스를 고치지 않는다. 아래는 소유 패킷 재작업 대상이다.

1. **Switch 30px** (0013 CheckupItemRow, 0016 FamilyChecklistSheet) — TDS Switch 자체 높이다. Switch를 감싼
   `div`(stopPropagation)를 44px 이상 탭 영역으로 넓히거나, 행 전체 탭으로 토글하는 방식을 검토한다.
   스타일로 늘릴 경우 TT-AC-1(인라인 height 금지)과 충돌하므로 TDS 안에서 해법을 찾는다.
2. **마감 배너 "닫기" 32px** (0015 DeadlineBanner) — `size="small"` 대신 기본 크기 이상 Button을 쓴다.
3. **TextField 37px** (0010 ProfileFormFields) — 라벨을 포함한 필드 묶음은 95px이라 라벨 탭으로 포커스가 가는지
   실기기에서 확인한다. 상자만 탭 가능하면 미달이다.

## 실기기 측정 절차

1. 토스 앱 QR 테스트로 진입한다. 뷰포트 폭 360~420px 기기를 Android·iOS 각 1대 이상 쓴다(예: Galaxy S23 360px, iPhone 15 393px).
2. 위 시드와 같은 프로필을 만든다(본인 1980 여성 직장 사무직, 가족 엄마 1956 여성 피부양자).
3. 각 요소를 원격 디버깅(Safari Web Inspector / chrome://inspect)에서 선택해 높이를 읽고 "실기기" 칸에 적는다.
4. Chromium 값과 2px 이상 다르면 비고에 남긴다.
