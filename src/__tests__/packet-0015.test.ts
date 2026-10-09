import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAnalytics, mockLogImpression, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import { evaluateProfile } from "@/domain/checkup";
import type { BannerState, CheckupItemId, CheckupRecord, InsuranceType, Profile, Sex, StoreResult } from "@/lib/types";
import DeadlineBanner from "@/components/home/DeadlineBanner";

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
}));

mockTds();
mockRouter();
mockAnalytics();

const mockDismissBanner = vi.fn<(month?: string) => StoreResult>();
let mockStatus: "loading" | "ready" = "ready";
let mockBanner: BannerState = { dismissedMonth: null };
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({ status: mockStatus, banner: mockBanner, dismissBanner: mockDismissBanner }),
}));

const NOW = "2026-10-10T00:00:00.000Z";

function profile(birthYear: number, sex: Sex, insuranceType: InsuranceType): Profile {
  return { id: "self-1", name: "민지", role: "self", birthYear, sex, insuranceType, createdAt: NOW, updatedAt: NOW };
}

function rec(itemId: CheckupItemId): CheckupRecord {
  return { profileId: "self-1", itemId, year: 2026, receivedAt: NOW };
}

function setToday(iso: string): Date {
  const d = new Date(`${iso}T09:00:00+09:00`);
  vi.setSystemTime(d);
  return d;
}

function Harness(props: { today: Date; birthYear?: number; initial?: CheckupRecord[] }) {
  const [records, setRecords] = useState<CheckupRecord[]>(props.initial ?? []);
  const result = evaluateProfile(profile(props.birthYear ?? 1986, "male", "employee_office"), records, props.today);
  return React.createElement(
    MemoryRouter,
    null,
    React.createElement(DeadlineBanner, { result, today: props.today }),
    React.createElement(
      "button",
      { "data-testid": "mark-all", onClick: () => setRecords([rec("general"), rec("stomach")]) },
      "all",
    ),
  );
}

function renderBanner(today: Date, birthYear = 1986, initial?: CheckupRecord[]) {
  return render(React.createElement(Harness, { today, birthYear, initial }));
}

const banner = () => screen.queryAllByTestId("deadline-banner");

describe("하반기 마감 배너 — DeadlineBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mockStatus = "ready";
    mockBanner = { dismissedMonth: null };
    mockDismissBanner.mockReset();
    mockDismissBanner.mockReturnValue({ ok: true });
  });

  it("F6-AC-1: 10-10·1986 office·기록 0건이면 D-82와 남은 검진 2개 문구, deadline_banner 노출 로그 1회", () => {
    renderBanner(setToday("2026-10-10"));

    const el = screen.getByTestId("deadline-banner");
    expect(within(el).getByText("올해 검진 마감까지 D-82")).toBeInTheDocument();
    expect(
      within(el).getByText("남은 검진 2개 · 12월 31일이 지나면 올해 대상에서 넘어가요"),
    ).toBeInTheDocument();
    expect(within(el).queryAllByText("마감 임박")).toHaveLength(0);
    expect(mockLogImpression.mock.calls.filter((c) => c[0] === "deadline_banner")).toHaveLength(1);
  });

  it("F6-AC-2: 06-30이면 배너 0개, 07-01이면 D-183", () => {
    const { unmount } = renderBanner(setToday("2026-06-30"));
    expect(banner()).toHaveLength(0);
    expect(screen.queryByText(/D-/)).toBeNull();
    unmount();

    renderBanner(setToday("2026-07-01"));
    expect(banner()).toHaveLength(1);
    expect(screen.getByText("올해 검진 마감까지 D-183")).toBeInTheDocument();
  });

  it("F6-AC-3: 12-01이면 Badge '마감 임박'과 '마감 30일 전이에요'가 보인다", () => {
    renderBanner(setToday("2026-12-01"));

    const el = screen.getByTestId("deadline-banner");
    expect(within(el).getByText("마감 임박")).toBeInTheDocument();
    expect(within(el).getByText("마감 30일 전이에요")).toBeInTheDocument();
    expect(within(el).getByText("올해 검진 마감까지 D-30")).toBeInTheDocument();
  });

  it("F6-AC-4: general·stomach가 모두 ON이 되면 배너가 즉시 0개가 된다", () => {
    renderBanner(setToday("2026-10-10"));
    expect(banner()).toHaveLength(1);

    fireEvent.click(screen.getByTestId("mark-all"));

    expect(banner()).toHaveLength(0);
    expect(screen.queryByText(/올해 검진 마감까지/)).toBeNull();
  });

  it("CS-AC-1: 1985 office(대상 0개)면 처음부터 배너 0개", () => {
    const { container } = renderBanner(setToday("2026-10-10"), 1985);

    expect(banner()).toHaveLength(0);
    expect(container.textContent).not.toContain("D-");
    expect(mockLogImpression.mock.calls.filter((c) => c[0] === "deadline_banner")).toHaveLength(0);
  });

  it("F6-AC-5: '닫기'를 탭하면 dismissBanner('2026-10')이 호출되고 배너가 사라진다. 11-01엔 다시 보인다", () => {
    const today = setToday("2026-10-10");
    const { unmount } = renderBanner(today);

    fireEvent.click(within(screen.getByTestId("deadline-banner")).getByRole("button", { name: "닫기" }));
    expect(mockDismissBanner).toHaveBeenCalledTimes(1);
    expect(mockDismissBanner).toHaveBeenCalledWith("2026-10");
    unmount();

    // 스토어가 저장한 값 — 같은 달엔 숨김
    mockBanner = { dismissedMonth: "2026-10" };
    const r1 = renderBanner(today);
    expect(banner()).toHaveLength(0);
    r1.unmount();

    // 다음 달이면 다시 보인다
    renderBanner(setToday("2026-11-01"));
    expect(banner()).toHaveLength(1);
    expect(screen.getByText("올해 검진 마감까지 D-60")).toBeInTheDocument();
  });

  it("F6-AC-6: status가 'loading'이면 렌더하지 않는다", () => {
    mockStatus = "loading";
    const { container } = renderBanner(setToday("2026-10-10"));

    expect(banner()).toHaveLength(0);
    expect(container.textContent).not.toContain("D-");
    expect(mockLogImpression.mock.calls.filter((c) => c[0] === "deadline_banner")).toHaveLength(0);
  });

  it("F6-AC-6: banner 값이 손상돼 dismissedMonth가 null이면 정상 표시한다", () => {
    mockBanner = { dismissedMonth: null };
    renderBanner(setToday("2026-10-10"));

    expect(banner()).toHaveLength(1);
    expect(screen.getByText("올해 검진 마감까지 D-82")).toBeInTheDocument();
  });
});
