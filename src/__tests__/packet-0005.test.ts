/**
 * 표시 문구·canToggle·마감 배너 판정 — 순수 함수 테스트.
 *
 * 순수 함수 패킷이라 TDS·라우터·AppState 목은 걸지 않는다(UI가 없다).
 * 날짜 의존 코드가 시계를 읽지 않도록 Date만 고정하고, 기준일은 인자로 넘긴다.
 *
 * 계약 메모(구현 전 고정):
 * - itemDescription(status, year): 설명 문구. 조건부 대상 문구("조건에 해당하면 올해 대상")는 status만으로 결정된다.
 * - canToggle(status, eligibleCount): Switch 렌더 여부의 단일 출처. 화면은 이 값만 쓴다.
 * - heroCaption(result) / emptyStateText(result): ProfileResult에서 바로 만든다.
 * - bannerView(result, bannerState, today): 노출 조건을 모두 만족할 때만 객체, 아니면 null.
 *
 * 픽스처는 실제 판정 엔진(evaluateProfile)으로 만든다 — 규칙이 바뀌면 여기서 함께 드러난다.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { itemDescription, canToggle, heroCaption, emptyStateText } from "@/domain/format";
import { bannerView } from "@/domain/banner";
import { evaluateProfile } from "@/domain/checkup";
import type { BannerState, CheckupRecord, ItemStatus, Profile, ProfileResult } from "@/lib/types";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
});

const profile = (
  id: string,
  birthYear: number,
  sex: Profile["sex"],
  insuranceType: Profile["insuranceType"],
  role: Profile["role"] = "self",
): Profile => ({
  id,
  name: id,
  role,
  birthYear,
  sex,
  insuranceType,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
});

const male1986 = profile("self", 1986, "male", "employee_office");
const male1985 = profile("self", 1985, "male", "employee_office");
const female1987 = profile("fam", 1987, "female", "regional_head", "family");

const record = (profileId: string, itemId: CheckupRecord["itemId"], year = 2026): CheckupRecord => ({
  profileId,
  itemId,
  year,
  receivedAt: `${year}-06-01T00:00:00.000Z`,
});

const at = (month: number, day: number) => new Date(2026, month - 1, day);

const evaluate = (p: Profile, records: CheckupRecord[], today: Date): ProfileResult =>
  evaluateProfile(p, records, today);

const itemOf = (result: ProfileResult, id: ItemStatus["itemId"]): ItemStatus => {
  const found = result.items.find((i) => i.itemId === id);
  if (!found) throw new Error(`item ${id} not in result`);
  return found;
};

describe("표시 문구·canToggle·마감 배너 판정 (순수 함수)", () => {
  it("AC-1: should describe a received general as '받았어요 · 다음 대상 2028년' and an unreceived eligible general as '올해 대상 · 12월 31일까지'", () => {
    const received = itemOf(evaluate(male1986, [record("self", "general")], at(10, 10)), "general");
    const pending = itemOf(evaluate(male1986, [], at(10, 10)), "general");

    expect(received.received).toBe(true);
    expect(itemDescription(received, 2026)).toBe("받았어요 · 다음 대상 2028년");
    expect(pending.eligibleThisYear).toBe(true);
    expect(itemDescription(pending, 2026)).toBe("올해 대상 · 12월 31일까지");
  });

  it("AC-1: should describe a non-target colorectal as '다음 대상 2036년'", () => {
    const colorectal = itemOf(evaluate(male1986, [], at(10, 10)), "colorectal");

    expect(colorectal.eligibleThisYear).toBe(false);
    expect(colorectal.nextYear).toBe(2036);
    expect(itemDescription(colorectal, 2026)).toBe("다음 대상 2036년");
  });

  it("AC-1: should return the status reason when nextYear is null", () => {
    const lung: ItemStatus = {
      itemId: "lung",
      label: "폐암 검진",
      eligibleThisYear: false,
      conditional: true,
      received: false,
      nextYear: null,
      reason: "대상 연령(54~74세)이 아니에요",
    };

    expect(lung.nextYear).toBeNull();
    expect(itemDescription(lung, 2026)).toBe("대상 연령(54~74세)이 아니에요");
  });

  it("AC-2: should return false for 1985 office liver with eligibleCount 0, and describe it as '조건에 해당하면 올해 대상'", () => {
    const result = evaluate(male1985, [], at(10, 10));
    const liver = itemOf(result, "liver");

    expect(result.eligibleCount).toBe(0);
    expect(liver.eligibleThisYear).toBe(true);
    expect(liver.conditional).toBe(true);
    expect(canToggle(liver, result.eligibleCount)).toBe(false);
    expect(itemDescription(liver, 2026)).toBe("조건에 해당하면 올해 대상");
  });

  it("AC-2: should return true for 1986 office liver with eligibleCount 2", () => {
    const result = evaluate(male1986, [], at(10, 10));
    const liver = itemOf(result, "liver");

    expect(result.eligibleCount).toBe(2);
    expect(liver.eligibleThisYear).toBe(true);
    expect(canToggle(liver, result.eligibleCount)).toBe(true);
    expect(canToggle(itemOf(result, "colorectal"), result.eligibleCount)).toBe(false);
  });

  it("AC-3: should return '올해 검진 완료 · 다음 검진 2028년' when every core target is received", () => {
    const result = evaluate(male1986, [record("self", "general"), record("self", "stomach")], at(10, 10));

    expect(result.receivedCount).toBe(result.eligibleCount);
    expect(result.nextCheckupYear).toBe(2028);
    expect(heroCaption(result)).toBe("올해 검진 완료 · 다음 검진 2028년");
  });

  it("AC-3: should return 'D-82 · 12월 31일까지' while a core target is still open, and the empty-state copy for 1987 female regional_head", () => {
    const open = evaluate(male1986, [], at(10, 10));
    const empty = evaluate(female1987, [], at(10, 10));

    expect(heroCaption(open)).toBe("D-82 · 12월 31일까지");
    expect(empty.eligibleCount).toBe(0);
    expect(emptyStateText(empty)).toEqual({
      title: "올해는 받을 국가검진이 없어요",
      description: "다음 대상: 2027년",
    });
  });

  it("AC-4: should return the D-82 banner for 1986 office with no records on 2026-10-10", () => {
    const view = bannerView(evaluate(male1986, [], at(10, 10)), { dismissedMonth: null }, at(10, 10));

    expect(view).toMatchObject({
      title: "올해 검진 마감까지 D-82",
      body: "남은 검진 2개 · 12월 31일이 지나면 올해 대상에서 넘어가요",
      urgent: false,
    });
  });

  it("AC-4: should hide the banner on 06-30, show D-183 on 07-01, and mark urgent with '마감 30일 전이에요' on 12-01", () => {
    const state: BannerState = { dismissedMonth: null };

    expect(bannerView(evaluate(male1986, [], at(6, 30)), state, at(6, 30))).toBeNull();

    const july = bannerView(evaluate(male1986, [], at(7, 1)), state, at(7, 1));
    expect(july?.title).toContain("D-183");

    const december = bannerView(evaluate(male1986, [], at(12, 1)), state, at(12, 1));
    expect(december).toMatchObject({ urgent: true, urgentText: "마감 30일 전이에요" });
  });

  it("AC-5: should return null when every core target is received or eligibleCount is 0, and hide the banner on the dismissed month only", () => {
    const allReceived = evaluate(male1986, [record("self", "general"), record("self", "stomach")], at(10, 10));
    const noTargets = evaluate(female1987, [], at(10, 10));
    expect(bannerView(allReceived, { dismissedMonth: null }, at(10, 10))).toBeNull();
    expect(bannerView(noTargets, { dismissedMonth: null }, at(10, 10))).toBeNull();

    const open = evaluate(male1986, [], at(10, 10));
    expect(bannerView(open, { dismissedMonth: "2026-10" }, at(10, 10))).toBeNull();

    const nextMonth = bannerView(evaluate(male1986, [], at(11, 1)), { dismissedMonth: "2026-10" }, at(11, 1));
    expect(nextMonth).toMatchObject({ urgent: false });
    expect(nextMonth?.title).toContain("D-60");
  });
});
