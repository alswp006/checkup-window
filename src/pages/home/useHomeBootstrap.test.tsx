import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { renderWithProviders } from "@/test/renderWithProviders";
import { KEYS } from "@/data/storage";
import { useHomeBootstrap } from "@/pages/home/useHomeBootstrap";

// mocks.ts는 import만 해도 react-router-dom을 목으로 바꾼다 — 실제 라우터가 필요해 TDS만 직접 목킹한다.
const mockOpenToast = vi.hoisted(() => vi.fn());
vi.mock("@toss/tds-mobile", () => ({ useToast: () => ({ openToast: mockOpenToast }) }));

const NOW = "2026-10-10T00:00:00.000Z";

function seedSelf() {
  const self = {
    id: "self-1",
    name: "나",
    role: "self",
    birthYear: 1986,
    sex: "male",
    insuranceType: "employee_office",
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { [KEYS.profiles]: JSON.stringify({ version: 1, data: [self] }) };
}

function Home() {
  const { phase, selfResult } = useHomeBootstrap();
  const location = useLocation();
  return (
    <div data-testid="home">{`${phase}:${selfResult?.profileId ?? "-"}:${location.state === null ? "nostate" : "state"}`}</div>
  );
}

function renderApp(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile/new" element={<div data-testid="profile-new" />} />
    </Routes>,
    options,
  );
}

describe("useHomeBootstrap (실제 스토어)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    mockOpenToast.mockReset();
  });

  it("본인 프로필이 없으면 /profile/new로 이동한다", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByTestId("profile-new")).toBeInTheDocument());
  });

  it("본인 프로필이 있으면 ready이고 결과를 돌려준다", async () => {
    renderApp({ storage: seedSelf() });
    await waitFor(() => expect(screen.getByTestId("home").textContent).toMatch(/^ready:self-1:/));
    expect(mockOpenToast).not.toHaveBeenCalled();
  });

  it("toast saved 상태로 진입하면 토스트 1회 후 state가 비워진다", async () => {
    renderApp({ storage: seedSelf(), state: { toast: "saved" } });
    await waitFor(() => expect(screen.getByTestId("home").textContent).toMatch(/nostate$/));
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith("저장했어요");
  });
});
