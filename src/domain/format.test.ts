import { describe, it, expect } from "vitest";
import { itemDescription, canToggle, heroCaption, emptyStateText } from "@/domain/format";
import type { ItemStatus, ProfileResult } from "@/lib/types";

const status = (over: Partial<ItemStatus>): ItemStatus => ({
  itemId: "general",
  label: "일반 검진",
  eligibleThisYear: true,
  conditional: false,
  received: false,
  nextYear: 2026,
  reason: "사유",
  ...over,
});

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

describe("format", () => {
  it("itemDescription 분기", () => {
    expect(itemDescription(status({ received: true, nextYear: 2028 }), 2026)).toBe("받았어요 · 다음 대상 2028년");
    expect(itemDescription(status({}), 2026)).toBe("올해 대상 · 12월 31일까지");
    expect(itemDescription(status({ conditional: true }), 2026)).toBe("조건에 해당하면 올해 대상");
    expect(itemDescription(status({ eligibleThisYear: false, nextYear: 2036 }), 2026)).toBe("다음 대상 2036년");
    expect(itemDescription(status({ eligibleThisYear: false, nextYear: null }), 2026)).toBe("사유");
  });

  it("canToggle", () => {
    expect(canToggle(status({ conditional: true }), 0)).toBe(false);
    expect(canToggle(status({ conditional: true }), 2)).toBe(true);
    expect(canToggle(status({ eligibleThisYear: false }), 2)).toBe(false);
  });

  it("heroCaption·emptyStateText", () => {
    expect(heroCaption(result({}))).toBe("D-82 · 12월 31일까지");
    expect(heroCaption(result({ receivedCount: 2 }))).toBe("올해 검진 완료 · 다음 검진 2028년");
    expect(emptyStateText(result({ eligibleCount: 0, nextCheckupYear: 2027 }))).toEqual({
      title: "올해는 받을 국가검진이 없어요",
      description: "다음 대상: 2027년",
    });
  });
});
