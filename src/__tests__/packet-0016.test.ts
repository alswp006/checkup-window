import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAnalytics, mockLogClick, mockLogImpression, mockNavigate, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import { evaluateAll } from "@/domain/plan";
import type { CheckupItemId, CheckupRecord, Profile, ProfileResult, StoreResult } from "@/lib/types";
import LockedTier from "@/components/home/LockedTier";
import FamilyTeaser from "@/components/home/FamilyTeaser";
import FamilyChecklistSheet from "@/components/home/FamilyChecklistSheet";

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
}));

mockTds();
mockRouter();
mockAnalytics();

const NOW = "2026-10-10T00:00:00.000Z";
const TODAY = new Date("2026-10-10T09:00:00+09:00");

function profile(
  id: string,
  name: string,
  role: Profile["role"],
  birthYear: number,
  sex: Profile["sex"],
  insuranceType: Profile["insuranceType"],
): Profile {
  return { id, name, role, birthYear, sex, insuranceType, createdAt: NOW, updatedAt: NOW };
}

const SELF = profile("self-1", "나", "self", 1986, "male", "employee_office");
const MOM = profile("mom-1", "엄마", "family", 1966, "female", "dependent");
const DAD = profile("dad-1", "아빠", "family", 1963, "male", "regional_head");
const SIBLING = profile("sib-1", "동생", "family", 1997, "female", "dependent");
const UNCLE = profile("unc-1", "삼촌", "family", 1800, "male", "dependent");

const mockToggleRecord = vi.fn<(profileId: string, itemId: CheckupItemId, year: number) => StoreResult>();
let mockProfiles: Profile[] = [];
const mockRecords: CheckupRecord[] = [];
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({
    status: "ready",
    profiles: mockProfiles,
    records: mockRecords,
    toggleRecord: mockToggleRecord,
  }),
}));

function results(profiles: Profile[]): { selfResult: ProfileResult; familyResults: Record<string, ProfileResult | null> } {
  const { results: ok } = evaluateAll(profiles, [], TODAY);
  const byId = new Map(ok.map((r) => [r.profileId, r]));
  const familyResults: Record<string, ProfileResult | null> = {};
  for (const p of profiles.filter((x) => x.role === "family")) familyResults[p.id] = byId.get(p.id) ?? null;
  return { selfResult: byId.get(SELF.id) as ProfileResult, familyResults };
}

function renderTier(family: Profile[]) {
  mockProfiles = [SELF, ...family];
  const { selfResult, familyResults } = results(mockProfiles);
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(LockedTier, { self: SELF, family, selfResult, familyResults }),
    ),
  );
}

describe("잠금 층 — LockedTier + FamilyTeaser + FamilyChecklistSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
    mockToggleRecord.mockReset();
    mockToggleRecord.mockReturnValue({ ok: true });
    mockNavigate.mockReset();
    mockLogClick.mockReset();
    mockLogImpression.mockReset();
  });

  it("F7-AC-2: 3개년 Card 3장, 2027 문구, 가족 결과 행, 노출 로그 1회", () => {
    renderTier([MOM, DAD]);
    const tier = screen.getByTestId("locked-tier");
    for (const y of [2026, 2027, 2028]) {
      expect(within(tier).getByTestId(`plan-year-${y}`)).toBeInTheDocument();
    }
    const y2027 = within(screen.getByTestId("plan-year-2027"));
    expect(y2027.getByText("아빠 — 일반건강검진·위암 검진·대장암 검진")).toBeInTheDocument();
    expect(y2027.getByText("나 — 조건부 간암만")).toBeInTheDocument();
    expect(within(tier).getByText("엄마 · 올해 대상 5개")).toBeInTheDocument();
    expect(within(tier).getByText("아빠 · 올해 대상 1개(대장암)")).toBeInTheDocument();
    expect(mockLogImpression.mock.calls.filter((c) => c[0] === "reward_locked_tier")).toHaveLength(1);
  });

  it("F7-AC-4: 티저는 가족 이름을, 0명이면 안내 문구를 보여 준다", () => {
    const { unmount } = render(
      React.createElement(MemoryRouter, null, React.createElement(FamilyTeaser, { family: [MOM, DAD] })),
    );
    expect(screen.getByText("등록한 가족: 엄마 · 아빠")).toBeInTheDocument();
    expect(screen.queryByText("가족을 추가해 함께 확인해요")).toBeNull();
    unmount();
    render(React.createElement(MemoryRouter, null, React.createElement(FamilyTeaser, { family: [] })));
    expect(screen.getByText("가족을 추가해 함께 확인해요")).toBeInTheDocument();
    expect(screen.queryByText(/등록한 가족:/)).toBeNull();
  });

  it("F7-AC-5: 가족 0명이면 본인만 담긴 Card 3장과 빈 상태, '가족 추가'가 이동·로그를 남긴다", () => {
    renderTier([]);
    for (const y of [2026, 2027, 2028]) {
      const card = within(screen.getByTestId(`plan-year-${y}`));
      expect(card.getByText(/^나 — /)).toBeInTheDocument();
      expect(card.queryByText(/^(엄마|아빠) — /)).toBeNull();
    }
    expect(screen.getByText("가족을 추가하면 함께 볼 수 있어요")).toBeInTheDocument();
    expect(document.querySelector("[data-content-icon]")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
    expect(mockLogClick).toHaveBeenCalledWith("family_add");
    expect(mockNavigate).toHaveBeenCalledWith("/profile/new", { state: { mode: "family" } });
  });

  it("F7-AC-6: 엄마 행을 탭하면 시트에 항목 행 7개·조건부 2개·Switch가 보이고 엄마 id로 저장한다", () => {
    renderTier([MOM, DAD]);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByText("엄마 · 올해 대상 5개"));

    const sheet = within(screen.getByRole("dialog"));
    expect(sheet.getAllByTestId(/^checkup-item-/)).toHaveLength(7);
    expect(sheet.getAllByText("조건부")).toHaveLength(2);
    expect(sheet.getAllByRole("switch").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(sheet.getAllByRole("switch")[0]);
    expect(mockToggleRecord).toHaveBeenCalledTimes(1);
    expect(mockToggleRecord.mock.calls[0][0]).toBe("mom-1");
    expect(mockToggleRecord.mock.calls[0][2]).toBe(2026);
  });

  it("F7-AC-6: FamilyChecklistSheet '정보 수정'은 state 없이 edit 경로로 이동한다", () => {
    mockProfiles = [SELF, MOM];
    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(FamilyChecklistSheet, { profileId: "mom-1", onClose: vi.fn() }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "정보 수정" }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate.mock.calls[0]).toEqual(["/profile/mom-1/edit"]);
  });

  it("F7-AC-6: 시트는 null·없는 id·출생연도 오류 id에서 닫힌 채 크래시하지 않는다", () => {
    mockProfiles = [SELF, UNCLE];
    for (const id of [null, "ghost-id", "unc-1"]) {
      const { unmount } = render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(FamilyChecklistSheet, { profileId: id, onClose: vi.fn() }),
        ),
      );
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryAllByTestId(/^checkup-item-/)).toHaveLength(0);
      unmount();
    }
  });

  it("F7-AC-7: 비대상 가족(동생)도 '올해 대상 없음 · 다음 2027년' 행으로 남는다", () => {
    renderTier([MOM, SIBLING]);
    expect(within(screen.getByTestId("locked-tier")).getByText("동생 · 올해 대상 없음 · 다음 2027년")).toBeInTheDocument();
    expect(within(screen.getByTestId("locked-tier")).getByText("엄마 · 올해 대상 5개")).toBeInTheDocument();
  });

  it("DV-AC-2: 출생연도 오류 가족(삼촌)은 안내 행과 계획표 줄로 남고, 탭하면 edit로 이동한다", () => {
    renderTier([UNCLE]);
    const tier = within(screen.getByTestId("locked-tier"));
    for (const y of [2026, 2027, 2028]) {
      expect(within(screen.getByTestId(`plan-year-${y}`)).getByText("삼촌 — 출생연도를 확인해주세요")).toBeInTheDocument();
    }
    fireEvent.click(tier.getByText("삼촌 · 출생연도를 확인해주세요"));
    expect(mockNavigate).toHaveBeenCalledWith("/profile/unc-1/edit");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
