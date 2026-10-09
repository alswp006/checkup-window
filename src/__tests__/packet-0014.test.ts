import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useState } from "react";
import { readFileSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  mockAnalytics,
  mockLogClick,
  mockLogImpression,
  mockShareApp,
  mockRouter,
  mockTds,
  mockTossRewardAd,
} from "@/__tests__/__helpers__/mocks";
import { evaluateProfile } from "@/domain/checkup";
import type { CheckupItemId, CheckupRecord, InsuranceType, Profile, Sex, StoreResult } from "@/lib/types";
import FreeTier from "@/components/home/FreeTier";

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
}));

mockTds();
mockTossRewardAd();
mockRouter();
mockAnalytics();

const mockToggleRecord = vi.fn<(profileId: string, itemId: CheckupItemId, year: number) => StoreResult>();
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({ toggleRecord: mockToggleRecord }),
}));

const TODAY = new Date("2026-10-10T09:00:00+09:00");
const SELF_ID = "self-1";
const NOW = "2026-10-10T00:00:00.000Z";
const DISCLAIMER = "정확한 대상 여부는 국민건강보험공단 안내를 확인하세요";

function profile(birthYear: number, sex: Sex, insuranceType: InsuranceType): Profile {
  return { id: SELF_ID, name: "민지", role: "self", birthYear, sex, insuranceType, createdAt: NOW, updatedAt: NOW };
}

/** 실제 판정 엔진 결과를 먹이고, 토글 성공 시 기록을 늘려 다시 판정한다. */
function Harness(props: { birthYear: number; sex: Sex; insuranceType: InsuranceType; initial?: CheckupRecord[] }) {
  const [records, setRecords] = useState<CheckupRecord[]>(props.initial ?? []);
  const result = evaluateProfile(profile(props.birthYear, props.sex, props.insuranceType), records, TODAY);

  mockToggleRecord.mockImplementation((pid, iid, y) => {
    setRecords((prev) => {
      const exists = prev.some((r) => r.profileId === pid && r.itemId === iid && r.year === y);
      return exists
        ? prev.filter((r) => !(r.profileId === pid && r.itemId === iid && r.year === y))
        : [...prev, { profileId: pid, itemId: iid, year: y, receivedAt: NOW }];
    });
    return { ok: true };
  });

  return React.createElement(
    MemoryRouter,
    null,
    React.createElement(FreeTier, { result, profileId: SELF_ID }),
  );
}

function renderTier(birthYear: number, sex: Sex, insuranceType: InsuranceType, initial?: CheckupRecord[]) {
  return render(React.createElement(Harness, { birthYear, sex, insuranceType, initial }));
}

const tier = () => screen.getByTestId("free-tier");
const bar = () => within(screen.getByTestId("summary-hero")).getByRole("progressbar");

describe("무료 층 — FreeTier (히어로·체크리스트·빈 상태·고지·공유)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
    mockToggleRecord.mockReset();
  });

  it("F4-AC-1·2: 1986·male·office는 general·stomach·liver 행, liver에만 '조건부', 히어로 2개·D-82·MiniBar 0", () => {
    renderTier(1986, "male", "employee_office");

    for (const id of ["general", "stomach", "liver"]) {
      expect(within(tier()).getByTestId(`checkup-item-${id}`)).toBeInTheDocument();
    }
    expect(within(screen.getByTestId("checkup-item-liver")).getAllByText("조건부")).toHaveLength(1);
    expect(within(screen.getByTestId("checkup-item-general")).queryAllByText("조건부")).toHaveLength(0);
    expect(within(screen.getByTestId("checkup-item-stomach")).queryAllByText("조건부")).toHaveLength(0);

    const hero = screen.getByTestId("summary-hero");
    expect(within(hero).getByText(/올해 대상\s*2개/)).toBeInTheDocument();
    expect(within(hero).getByText(/D-82/)).toBeInTheDocument();
    expect(bar().getAttribute("aria-valuenow")).toBe("0");

    expect(within(screen.getByTestId("checkup-item-colorectal")).getByText("다음 대상 2036년")).toBeInTheDocument();
  });

  it("CS-AC-2·F7-AC-1: 1986이면 free-tier 안 Switch는 general·stomach·liver 3개이고 마운트 시 result_free_tier 노출 로그 1회", () => {
    renderTier(1986, "male", "employee_office");

    expect(within(tier()).getAllByRole("switch")).toHaveLength(3);
    for (const id of ["general", "stomach", "liver"]) {
      expect(within(screen.getByTestId(`checkup-item-${id}`)).getAllByRole("switch")).toHaveLength(1);
    }
    const impressions = mockLogImpression.mock.calls.filter((c) => c[0] === "result_free_tier");
    expect(impressions).toHaveLength(1);
  });

  it("F4-AC-3: 1987·female·regional_head는 빈 상태 — 아이콘·문구·다음 대상 연도, Switch 0, 'D-' 0건", () => {
    const { container } = renderTier(1987, "female", "regional_head");

    expect(container.querySelector("[data-content-icon]")).not.toBeNull();
    expect(within(tier()).getByText("올해는 받을 국가검진이 없어요")).toBeInTheDocument();
    expect(within(tier()).getByText(/다음 대상:\s*\d{4}년/)).toBeInTheDocument();
    expect(within(tier()).queryAllByRole("switch")).toHaveLength(0);
    expect(screen.queryByTestId("summary-hero")).toBeNull();
    expect(container.textContent).not.toContain("D-");
  });

  it("CS-AC-1: 1985·male·office는 빈 상태 '다음 대상: 2027년'이고 liver 행은 '조건부'로 남는다", () => {
    const { container } = renderTier(1985, "male", "employee_office");

    expect(within(tier()).getByText("올해는 받을 국가검진이 없어요")).toBeInTheDocument();
    expect(within(tier()).getByText("다음 대상: 2027년")).toBeInTheDocument();
    expect(within(tier()).queryAllByRole("switch")).toHaveLength(0);
    expect(container.textContent).not.toContain("D-");
    const liver = screen.getByTestId("checkup-item-liver");
    expect(within(liver).getAllByText("조건부")).toHaveLength(1);
    expect(within(liver).getByText("조건에 해당하면 올해 대상")).toBeInTheDocument();
  });

  it("F5-AC-2·3: general·stomach ON이면 완료 문구, general OFF면 MiniBar 1/2와 행 설명 복귀", () => {
    renderTier(1986, "male", "employee_office");
    const sw = (id: string) => within(screen.getByTestId(`checkup-item-${id}`)).getByRole("switch");

    fireEvent.click(sw("general"));
    expect(bar().getAttribute("aria-valuenow")).toBe("50");
    fireEvent.click(sw("stomach"));
    expect(within(screen.getByTestId("summary-hero")).getByText("올해 검진 완료 · 다음 검진 2028년")).toBeInTheDocument();

    fireEvent.click(sw("general"));
    expect(bar().getAttribute("aria-valuenow")).toBe("50");
    expect(
      within(screen.getByTestId("checkup-item-general")).getByText("올해 대상 · 12월 31일까지"),
    ).toBeInTheDocument();
    expect(screen.queryByText("올해 검진 완료 · 다음 검진 2028년")).toBeNull();
  });

  it("F4-AC-7: 공단 고지 문구는 대상이 있을 때도 빈 상태에서도 항상 보인다", () => {
    const { unmount } = renderTier(1986, "male", "employee_office");
    expect(within(tier()).getByText(DISCLAIMER)).toBeInTheDocument();
    unmount();

    renderTier(1985, "male", "employee_office");
    expect(within(tier()).getByText(DISCLAIMER)).toBeInTheDocument();
  });

  it("F5-AC-7: '결과 공유하기'를 탭하면 shareApp 1회와 logClick('share_result')", () => {
    renderTier(1986, "male", "employee_office");
    mockShareApp.mockClear();

    fireEvent.click(within(tier()).getByRole("button", { name: "결과 공유하기" }));

    expect(mockShareApp).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("share_result");
    expect(mockLogClick.mock.calls.filter((c) => c[0] === "share_result")).toHaveLength(1);
  });

  it("F7-AC-1: FreeTier 소스는 TossRewardAd를 import하지 않는다(광고 상태와 무관하게 항상 렌더)", () => {
    const src = readFileSync("src/components/home/FreeTier.tsx", "utf8");
    expect(src).not.toMatch(/TossRewardAd/);
    expect(src).not.toMatch(/AdSlot/);
  });
});
