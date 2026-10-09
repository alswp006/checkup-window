import type { BannerState, ProfileResult } from "@/lib/types";
import { isAllReceived } from "@/domain/format";

export interface BannerView {
  title: string;
  body: string;
  urgent: boolean;
  urgentText: string | null;
}

const BANNER_START_MONTH_INDEX = 6; // 7월
const URGENT_DAYS = 30;

function monthKey(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

/** 마감 배너 표시 내용. 노출 조건을 모두 만족하지 않으면 null. */
export function bannerView(result: ProfileResult, bannerState: BannerState, today: Date): BannerView | null {
  if (today.getMonth() < BANNER_START_MONTH_INDEX) return null;
  if (result.eligibleCount === 0 || isAllReceived(result)) return null;
  if (bannerState.dismissedMonth === monthKey(today)) return null;

  const urgent = result.daysLeft <= URGENT_DAYS;
  return {
    title: `올해 검진 마감까지 ${result.daysLeft === 0 ? "D-day" : `D-${result.daysLeft}`}`,
    body: `남은 검진 ${result.eligibleCount - result.receivedCount}개 · 12월 31일이 지나면 올해 대상에서 넘어가요`,
    urgent,
    urgentText: urgent ? `마감 ${URGENT_DAYS}일 전이에요` : null,
  };
}
