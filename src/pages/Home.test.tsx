import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor, within } from "@testing-library/react";
import { mockNavigate, mockOpenToast, mockTds } from "@/__tests__/__helpers__/mocks";
import { renderWithProviders } from "@/test/renderWithProviders";
import { KEYS } from "@/data/storage";
import type { HomeBootstrap } from "@/pages/home/useHomeBootstrap";

mockTds();

// mocks.ts는 import만 해도(vi.mock 호이스팅) TossRewardAd·react-router-dom 목을 자기 것으로 덮는다 —
// 게이트가 children을 안 그리는 경우와 location.state가 필요하므로 import 뒤에 doMock으로 다시 걸고 Home을 동적으로 읽는다.
const rewardAd = vi.hoisted(() => ({ renderChildren: true, props: [] as Array<Record<string, unknown>> }));

vi.mock("@/components/AdSlot", () => ({
  AdSlot: (p: { adGroupId: string }) => React.createElement("div", { "data-testid": "ad-slot", "data-ad-group-id": p.adGroupId }),
  default: (p: { adGroupId: string }) => React.createElement("div", { "data-testid": "ad-slot", "data-ad-group-id": p.adGroupId }),
}));

const boot = vi.hoisted(() => ({ override: null as null | ((actual: HomeBootstrap) => HomeBootstrap) }));
vi.mock("@/pages/home/useHomeBootstrap", async () => {
  const actual = await vi.importActual<typeof import("@/pages/home/useHomeBootstrap")>("@/pages/home/useHomeBootstrap");
  return {
    ...actual,
    useHomeBootstrap: () => {
      const real = actual.useHomeBootstrap();
      return boot.override ? boot.override(real) : real;
    },
  };
});

const NOW = "2026-10-10T00:00:00.000Z";

function seedSelf() {
  const self = {
    id: "self-1", name: "나", role: "self", birthYear: 1986, sex: "male",
    insuranceType: "employee_office", createdAt: NOW, updatedAt: NOW,
  };
  return {
    [KEYS.profiles]: JSON.stringify({ version: 1, data: [self] }),
    [KEYS.records]: JSON.stringify({ version: 1, data: [] }),
    [KEYS.banner]: JSON.stringify({ dismissedMonth: "2026-09" }),
  };
}

let Home: React.ComponentType;

beforeAll(async () => {
  vi.doMock("@/components/TossRewardAd", () => ({
    TossRewardAd: (p: { children: React.ReactNode } & Record<string, unknown>) => {
      rewardAd.props.push(p);
      return React.createElement("div", { "data-testid": "reward-gate" }, rewardAd.renderChildren ? p.children : null);
    },
  }));
  vi.doMock("react-router-dom", async () => ({
    ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
    useNavigate: () => mockNavigate,
  }));
  Home = (await import("@/pages/Home")).default;
});

function renderHome(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(React.createElement(Home), { storage: seedSelf(), ...options });
}

describe("홈 화면 조립 — Home (/)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "group-abc");
    vi.stubEnv("VITE_TOSS_AD_SLOT_ID", "slot-xyz");
    mockNavigate.mockReset();
    mockOpenToast.mockReset();
    rewardAd.renderChildren = true;
    rewardAd.props = [];
    boot.override = null;
  });

  it("F7-AC-1: 게이트가 children을 그리지 않아도 무료 층(검진 행·D-82)이 보인다", async () => {
    rewardAd.renderChildren = false;
    renderHome();
    await waitFor(() => expect(screen.getByTestId("free-tier")).toBeInTheDocument());
    const free = screen.getByTestId("free-tier");
    expect(within(free).getByText(/일반건강검진/)).toBeInTheDocument();
    expect(within(free).getByText(/위암 검진/)).toBeInTheDocument();
    expect(within(free).getByText(/D-82/)).toBeInTheDocument();
    expect(screen.queryByTestId("locked-tier")).toBeNull();
  });

  it("F7-AC-3: DOM 순서는 free-tier → AdSlot → 가족 티저 → locked-tier다", async () => {
    renderHome();
    await waitFor(() => expect(screen.getByTestId("free-tier")).toBeInTheDocument());
    const free = screen.getByTestId("free-tier");
    const ad = screen.getByTestId("ad-slot");
    const teaser = screen.getByText("가족을 추가해 함께 확인해요");
    const locked = screen.getByTestId("locked-tier");
    const before = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before(free, ad)).toBe(true);
    expect(before(ad, teaser)).toBe(true);
    expect(before(teaser, locked)).toBe(true);
    expect(ad.getAttribute("data-ad-group-id")).toBe("group-abc");
  });

  it("F7-AC-3: 게이트 안에는 locked-tier만 있고 free-tier는 없으며 slotId는 환경변수다", async () => {
    renderHome();
    await waitFor(() => expect(screen.getByTestId("reward-gate")).toBeInTheDocument());
    const gate = screen.getByTestId("reward-gate");
    expect(within(gate).getAllByTestId("locked-tier")).toHaveLength(1);
    expect(within(gate).queryAllByTestId("free-tier")).toHaveLength(0);
    expect(rewardAd.props[0].slotId).toBe("slot-xyz");
  });

  it("F4-AC-2: ready 상태에서 Top 제목은 '올해검진'이다", async () => {
    renderHome();
    await waitFor(() => expect(screen.getByTestId("free-tier")).toBeInTheDocument());
    expect(screen.getByText("올해검진")).toBeInTheDocument();
    expect(screen.getByTestId("deadline-banner")).toBeInTheDocument();
    // MiniBar도 progressbar 역할이다 — 로더는 aria-valuenow가 없다.
    expect(screen.queryAllByRole("progressbar").filter((el) => !el.hasAttribute("aria-valuenow"))).toHaveLength(0);
  });

  it("F4-AC-4: loading이면 Loader 1개만 보이고 히어로·배너는 없으며 navigate는 0회다", () => {
    boot.override = (real) => ({ ...real, phase: "loading", self: null, selfResult: null });
    renderHome();
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(screen.queryAllByTestId("summary-hero")).toHaveLength(0);
    expect(screen.queryAllByTestId("deadline-banner")).toHaveLength(0);
    expect(mockNavigate).toHaveBeenCalledTimes(0);
  });

  it("F4-AC-5: self가 없으면 /profile/new로 replace 이동한다", async () => {
    renderHome({ storage: {} });
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/profile/new", { replace: true, state: { mode: "self" } }),
    );
    expect(screen.queryAllByTestId("free-tier")).toHaveLength(0);
  });

  it("F4-AC-6: state {toast:'saved'}로 진입하면 '저장했어요'를 1회 띄운다", async () => {
    renderHome({ state: { toast: "saved" } });
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("저장했어요"));
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
  });

  it("DV-AC-2: 범위 밖 birthYear 가족이 있어도 크래시 없이 안내 행을 그린다", async () => {
    const bad = {
      id: "fam-bad", name: "어머니", role: "family", birthYear: 1850, sex: "female",
      insuranceType: "employee_office", createdAt: NOW, updatedAt: NOW,
    } as HomeBootstrap["family"][number];
    boot.override = (real) => ({ ...real, family: [bad], invalidFamily: [bad] });
    renderHome();
    await waitFor(() => expect(screen.getByTestId("locked-tier")).toBeInTheDocument());
    expect(within(screen.getByTestId("locked-tier")).getByText("어머니 · 출생연도를 확인해주세요")).toBeInTheDocument();
    expect(screen.getByTestId("free-tier")).toBeInTheDocument();
  });
});
