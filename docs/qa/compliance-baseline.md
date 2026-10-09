# 검수 기준선 — HEX 색상 스캔

앱인토스 검수는 HEX 색상 하드코딩을 막는다(다크모드 깨짐). 아래는 스캐폴드 정리 직후의 기준선이다.

## 스캔 명령

```
grep -rnE '#[0-9a-fA-F]{3,8}\b' src
```

## 결과

- `src/index.css`, `src/App.css`: 0건
- 그 외 `src/**`(테스트 포함): 아래 템플릿 파일 외 0건

기준선에 남은 4건은 전부 `src/styles/reward-ad.css`의 `var(--tds-color-*, 폴백)` 폴백 값이다.

```
src/styles/reward-ad.css:11
src/styles/reward-ad.css:19
src/styles/reward-ad.css:20
src/styles/reward-ad.css:29
```

## 기준선 예외 템플릿 파일

템플릿이 제공하는 파일이라 이 패킷에서 수정하지 않는다. 새로 쓰는 화면·컴포넌트는 예외 대상이 아니다.

- `src/components/TossRewardAd.tsx` — 리워드 광고 래퍼. HEX 폴백이 든 `src/styles/reward-ad.css`를 import한다.
- `src/main.tsx` — `@AI:ANCHOR`, 수정 금지(HEX 없음).
