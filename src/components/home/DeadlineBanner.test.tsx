import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAnalytics, mockLogImpression, mockTds } from "@/__tests__/__helpers__/mocks";
import { evaluateProfile } from "@/domain/checkup";
import type { BannerState, Profile, StoreResult } from "@/lib/types";
import DeadlineBanner from "@/components/home/DeadlineBanner";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

mockTds();
mockAnalytics();

const mockDismissBanner = vi.fn<(month?: string) => StoreResult>();
let mockStatus: "loading" | "ready" = "ready";
let mockBanner: BannerState = { dismissedMonth: null };
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({ status: mockStatus, banner: mockBanner, dismissBanner: mockDismissBanner }),
}));

const NOW = "2026-10-10T00:00:00.000Z";

function renderBanner(iso: string, birthYear = 1986) {
  const today = new Date(`${iso}T09:00:00+09:00`);
  vi.setSystemTime(today);
  const profile: Profile = {
    id: "self-1",
    name: "민지",
    role: "self",
    birthYear,
    sex: "male",
    insuranceType: "employee_office",
    createdAt: NOW,
    updatedAt: NOW,
  };
  return render(<DeadlineBanner result={evaluateProfile(profile, [], today)} today={today} />);
}

describe("DeadlineBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    mockStatus = "ready";
    mockBanner = { dismissedMonth: null };
    mockDismissBanner.mockReset();
    mockDismissBanner.mockReturnValue({ ok: true });
  });

  it("남은 일수와 안내 문구를 보여주고 노출 로그를 1회 남긴다", () => {
    renderBanner("2026-10-10");
    const el = screen.getByTestId("deadline-banner");
    expect(within(el).getByText("올해 검진 마감까지 D-82")).toBeInTheDocument();
    expect(within(el).queryByText("마감 임박")).toBeNull();
    expect(mockLogImpression.mock.calls.filter((c) => c[0] === "deadline_banner")).toHaveLength(1);
  });

  it("30일 이내면 마감 임박 배지를 붙인다", () => {
    renderBanner("2026-12-01");
    expect(screen.getByText("마감 임박")).toBeInTheDocument();
    expect(screen.getByText("마감 30일 전이에요")).toBeInTheDocument();
  });

  it("6월에는 보이지 않는다", () => {
    renderBanner("2026-06-30");
    expect(screen.queryByTestId("deadline-banner")).toBeNull();
  });

  it("닫기를 누르면 이번 달로 dismissBanner를 부르고 숨긴다", () => {
    renderBanner("2026-10-10");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(mockDismissBanner).toHaveBeenCalledWith("2026-10");
    expect(screen.queryByTestId("deadline-banner")).toBeNull();
  });

  it("loading이면 렌더하지 않는다", () => {
    mockStatus = "loading";
    renderBanner("2026-10-10");
    expect(screen.queryByTestId("deadline-banner")).toBeNull();
    expect(mockLogImpression).not.toHaveBeenCalled();
  });
});
