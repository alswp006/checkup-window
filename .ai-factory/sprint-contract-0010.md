# Sprint Contract — 패킷 0010
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

## Sprint Contract: 프로필 폼 본문 (ProfileFormFields + validate)

**만들 항목**
- `src/pages/profileForm/validate.ts`: `validateProfileForm(values, ctx)` 순수 함수. 필드별 에러 문구 객체를 반환한다. 출생연도는 4자리가 아니면 '출생연도 4자리를 입력해주세요', `1920`~`ctx.thisYear` 범위를 벗어나면 '1920~2026년 사이로 입력해주세요'. 성별, 가입유형, 이름 누락과 `existingNames` 중복, `mode==='family' && familyCount===9` 제한 문구를 포함한다.
- `src/pages/profileForm/ProfileFormFields.tsx`: controlled 컴포넌트. 출생연도 TextField(`inputMode='numeric'`, `maxLength=4`, 비숫자 제거, Enter 시 blur), 성별 Chip, 가입유형 ListRow 5개(설명 문구 매핑 포함). Chip과 ListRow 선택 시 `generateHapticFeedback({ type: 'tickWeak' })`를 1회 호출한다.
- 테스트: `validate.test.ts`, `ProfileFormFields.test.tsx`. 완료 조건 1~5를 케이스 단위로 1:1 대응시킨다.

**사용할 타입** (`src/lib/types.ts`에서 import)
- `Sex`, `InsuranceType`, `Profile` (`Profile['role']`을 `ctx.mode`에 사용)
- 폼 값: `Partial<Pick<Profile, 'name' | 'sex' | 'insuranceType'>> & { birthYear: string }`
- ctx: `{ thisYear: number; existingNames: string[]; familyCount: number; mode: Profile['role'] }`
- 위 폼 값/ctx 타입은 validate.ts 내부에서 export한다. `types.ts`는 수정하지 않는다.

**검증 방법**
- 프로젝트 테스트 러너로 `src/pages/profileForm` 테스트 전부 통과
- 완료 조건 1~5 각각에 대응하는 테스트 존재 확인 (`'19a8'` → onChange `'198'`, Enter 후 `document.activeElement` 변경 포함)
- `tsc --noEmit` 및 린트 통과
- validate.ts에 React, 라우터, storage import가 없는지 grep으로 확인

**절대 하면 안 되는 것**
- `main.tsx`, 라우터 설정, localStorage/저장소 접근 코드 수정 또는 추가 금지
- `src/lib/types.ts` 수정 금지. 타입 추가가 필요하면 작업을 멈추고 보고한다.
- ProfileFormFields에 라우팅·저장소 의존 또는 내부 폼 상태 보유 금지 (controlled 유지)
- 다른 페이지·컴포넌트 수정 및 새 의존성 추가 금지
- 명시된 에러 문구·설명 문자열을 임의로 바꾸지 않는다
