
## 검진 항목 행 — CheckupItemRow (Switch·조건부 시트) — fix loop 2026-10-09T16:36:05.076Z
- 시도 횟수: 1
- 트리아지: trivial (1 minor test failures)
- 에러 변화:
  Attempt 1: initial errors — tsc:0|lint:-|test:1
- 비용: $0.0458
- 수정된 파일:
 .ai-factory/shared-context.md               | 13 +++-
 src/__tests__/packet-0013.test.ts           | 19 +++++-
 src/components/home/CheckupItemRow.test.tsx | 93 +++++++++++++++++++++++++++++
 src/components/home/CheckupItemRow.tsx      | 86 ++++++++++++++++++++++++++
 4 files changed, 205 insertion

## 홈 화면 조립 — Home (/) — fix loop 2026-10-09T17:00:32.826Z
- 시도 횟수: 1
- 트리아지: moderate (4 test failures (tsc:0))
- 에러 변화:
  Attempt 1: initial errors — tsc:0|lint:-|test:4
- 비용: $0.1607
- 수정된 파일:
 .ai-factory/shared-context.md     |   6 ++
 src/__tests__/packet-0018.test.ts |  41 ++++++----
 src/pages/Home.test.tsx           | 156 ++++++++++++++++++++++++++++++++++++++
 src/pages/Home.tsx                | 103 ++++++++++---------------
 src/test/renderWithProviders.tsx  |   4 +-
 5 files chan
