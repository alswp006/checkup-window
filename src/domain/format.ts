import type { ItemStatus, ProfileResult } from "@/lib/types";

/** 항목 한 줄 설명. nextYear가 없으면 판정 엔진의 reason을 그대로 쓴다. */
export function itemDescription(status: ItemStatus, _year: number): string {
  if (status.received) {
    return status.nextYear === null ? status.reason : `받았어요 · 다음 대상 ${status.nextYear}년`;
  }
  if (status.eligibleThisYear) {
    return status.conditional ? "조건에 해당하면 올해 대상" : "올해 대상 · 12월 31일까지";
  }
  return status.nextYear === null ? status.reason : `다음 대상 ${status.nextYear}년`;
}

/** Switch 렌더 여부의 단일 출처. 조건부 항목은 비조건부 대상이 하나도 없으면 토글하지 않는다. */
export function canToggle(status: ItemStatus, eligibleCount: number): boolean {
  return status.eligibleThisYear && !(status.conditional && eligibleCount === 0);
}

/** 비조건부 대상을 모두 받았는가 (대상이 없으면 false). */
export function isAllReceived(result: ProfileResult): boolean {
  return result.eligibleCount > 0 && result.receivedCount >= result.eligibleCount;
}

/** 히어로 카드 보조 문구. */
export function heroCaption(result: ProfileResult): string {
  if (result.eligibleCount === 0) return "올해 받을 국가검진이 없어요";
  if (isAllReceived(result)) {
    return result.nextCheckupYear === null
      ? "올해 검진 완료"
      : `올해 검진 완료 · 다음 검진 ${result.nextCheckupYear}년`;
  }
  return `D-${result.daysLeft} · 12월 31일까지`;
}

/** 올해 대상이 없을 때의 빈 상태 문구. */
export function emptyStateText(result: ProfileResult): { title: string; description: string } {
  return {
    title: "올해는 받을 국가검진이 없어요",
    description: result.nextCheckupYear === null ? "다음 대상이 없어요" : `다음 대상: ${result.nextCheckupYear}년`,
  };
}
