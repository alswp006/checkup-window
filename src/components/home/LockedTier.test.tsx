import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAnalytics, mockLogClick, mockLogImpression, mockNavigate, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import { evaluateAll } from "@/domain/plan";
import type { CheckupRecord, Profile, ProfileResult } from "@/lib/types";
import LockedTier from "@/components/home/LockedTier";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

mockTds();
mockRouter();
mockAnalytics();

const NOW = "2026-10-10T00:00:00.000Z";
const TODAY = new Date("2026-10-10T09:00:00+09:00");

function profile(id: string, name: string, role: Profile["role"], birthYear: number, sex: Profile["sex"]): Profile {
  return { id, name, role, birthYear, sex, insuranceType: "employee_office", createdAt: NOW, updatedAt: NOW };
}

const SELF = profile("self-1", "나", "self", 1986, "male");
const MOM = profile("mom-1", "엄마", "family", 1966, "female");
const UNCLE = profile("unc-1", "삼촌", "family", 1800, "male");

let mockRecords: CheckupRecord[] = [];
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({ status: "ready", profiles: [], records: mockRecords, toggleRecord: vi.fn() }),
}));

function renderTier(family: Profile[]) {
  const { results } = evaluateAll([SELF, ...family], [], TODAY);
  const byId = new Map(results.map((r) => [r.profileId, r]));
  const familyResults: Record<string, ProfileResult | null> = {};
  for (const f of family) familyResults[f.id] = byId.get(f.id) ?? null;
  return render(
    <MemoryRouter>
      <LockedTier self={SELF} family={family} selfResult={byId.get(SELF.id) as ProfileResult} familyResults={familyResults} />
    </MemoryRouter>,
  );
}

describe("LockedTier", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
    mockRecords = [];
    mockNavigate.mockReset();
    mockLogClick.mockReset();
    mockLogImpression.mockReset();
  });

  it("레이아웃: 연도 Card 3장을 순서대로 그리고 노출 로그를 1회 남긴다", () => {
    renderTier([MOM]);
    const cards = within(screen.getByTestId("locked-tier")).getAllByTestId(/^plan-year-/);
    expect(cards.map((c) => c.getAttribute("data-testid"))).toEqual(["plan-year-2026", "plan-year-2027", "plan-year-2028"]);
    expect(mockLogImpression.mock.calls.filter((c) => c[0] === "reward_locked_tier")).toHaveLength(1);
  });

  it("출생연도 오류 가족의 행을 탭하면 시트 없이 edit로 이동한다", () => {
    renderTier([UNCLE]);
    fireEvent.click(screen.getByText("삼촌 · 출생연도를 확인해주세요"));
    expect(mockNavigate).toHaveBeenCalledWith("/profile/unc-1/edit");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("가족 추가는 family 모드로 새 프로필 폼에 이동하고 클릭 로그를 남긴다", () => {
    renderTier([MOM]);
    fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
    expect(mockLogClick).toHaveBeenCalledWith("family_add");
    expect(mockNavigate).toHaveBeenCalledWith("/profile/new", { state: { mode: "family" } });
  });
});
