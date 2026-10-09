import { describe, it, expect } from "vitest";
import { bannerView } from "@/domain/banner";
import type { ProfileResult } from "@/lib/types";

const result = (over: Partial<ProfileResult>): ProfileResult => ({
  profileId: "p",
  year: 2026,
  age: 40,
  items: [],
  eligibleCount: 2,
  receivedCount: 0,
  daysLeft: 82,
  nextCheckupYear: 2028,
  ...over,
});

const at = (month: number, day: number) => new Date(2026, month - 1, day);
const none = { dismissedMonth: null };

describe("bannerView", () => {
  it("마감 배너 내용", () => {
    expect(bannerView(result({}), none, at(10, 10))).toEqual({
      title: "올해 검진 마감까지 D-82",
      body: "남은 검진 2개 · 12월 31일이 지나면 올해 대상에서 넘어가요",
      urgent: false,
      urgentText: null,
    });
  });

  it("7월 이전은 null, 마감 30일 이내는 urgent", () => {
    expect(bannerView(result({ daysLeft: 184 }), none, at(6, 30))).toBeNull();
    expect(bannerView(result({ daysLeft: 183 }), none, at(7, 1))?.title).toContain("D-183");
    expect(bannerView(result({ daysLeft: 30 }), none, at(12, 1))).toMatchObject({
      urgent: true,
      urgentText: "마감 30일 전이에요",
    });
    expect(bannerView(result({ daysLeft: 31 }), none, at(11, 30))?.urgent).toBe(false);
  });

  it("모두 받았거나 대상 없음이면 null", () => {
    expect(bannerView(result({ receivedCount: 2 }), none, at(10, 10))).toBeNull();
    expect(bannerView(result({ eligibleCount: 0 }), none, at(10, 10))).toBeNull();
  });

  it("닫은 달에만 숨긴다", () => {
    const state = { dismissedMonth: "2026-10" };
    expect(bannerView(result({}), state, at(10, 10))).toBeNull();
    expect(bannerView(result({ daysLeft: 60 }), state, at(11, 1))).not.toBeNull();
  });
});
