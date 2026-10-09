import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAnalytics, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import { evaluateProfile } from "@/domain/checkup";
import type { Profile } from "@/lib/types";
import FreeTier from "@/components/home/FreeTier";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));
vi.mock("@/data/useCheckupStore", () => ({ useCheckupStore: () => ({ toggleRecord: vi.fn() }) }));

mockTds();
mockRouter();
mockAnalytics();

const NOW = "2026-10-10T00:00:00.000Z";
const TODAY = new Date("2026-10-10T09:00:00+09:00");

function renderTier(birthYear: number) {
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
  const result = evaluateProfile(profile, [], TODAY);
  return render(
    <MemoryRouter>
      <FreeTier result={result} profileId="self-1" />
    </MemoryRouter>,
  );
}

describe("FreeTier", () => {
  it("대상이 있으면 히어로와 Switch 행을 보여준다", () => {
    renderTier(1986);
    expect(within(screen.getByTestId("summary-hero")).getByText(/올해 대상\s*2개/)).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(3);
  });

  it("대상이 없으면 빈 상태이고 고지 문구는 남는다", () => {
    renderTier(1985);
    expect(screen.getByText("올해는 받을 국가검진이 없어요")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-hero")).toBeNull();
    expect(screen.getByText("정확한 대상 여부는 국민건강보험공단 안내를 확인하세요")).toBeInTheDocument();
  });
});
