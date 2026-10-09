import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { ComponentType } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { mockOpenToast, mockTds } from "@/__tests__/__helpers__/mocks";
import { KEYS } from "@/data/storage";

mockTds();

// mocks.ts는 import만 해도 react-router-dom 목을 호이스팅한다 — 종단 흐름은 진짜 라우터가 필요하므로
// 실제 모듈로 다시 걸고 App은 그 뒤에 읽는다.
let App: ComponentType;

beforeAll(async () => {
  vi.doMock("react-router-dom", async () => await vi.importActual<typeof import("react-router-dom")>("react-router-dom"));
  App = (await import("@/App")).default;
});

function LocationProbe() {
  return <div data-testid="probe">{useLocation().pathname}</div>;
}

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={["/", route]} initialIndex={route === "/" ? 0 : 1}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const pathname = () => screen.getByTestId("probe").textContent;
const storedProfiles = () => JSON.parse(localStorage.getItem(KEYS.profiles) ?? "{}").data as unknown[];

function fillProfile(name: string, birthYear: string, sex: "남성" | "여성", insurance: string) {
  fireEvent.change(screen.getByLabelText("이름"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("출생연도"), { target: { value: birthYear } });
  fireEvent.click(screen.getByRole("button", { name: sex }));
  fireEvent.click(screen.getByText(insurance));
}

describe("종단 흐름: 첫 입력 → 결과 → 수정 → 가족 추가·삭제", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    mockOpenToast.mockReset();
  });

  it("한 세션 안에서 전 여정을 끝까지 간다", async () => {
    renderApp("/");

    // 1) 빈 저장소 → 입력 화면 → 결과
    await waitFor(() => expect(pathname()).toBe("/profile/new"));
    fillProfile("나", "1986", "남성", "직장가입자(사무직)");
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    await waitFor(() => expect(pathname()).toBe("/"));
    let free = await screen.findByTestId("free-tier");
    expect(within(free).getByText(/올해 대상\s*2개/)).toBeInTheDocument();
    expect(screen.getAllByText(/D-82/).length).toBeGreaterThan(0);

    // 2) 내 정보 수정 → 1987 → 올해 대상 없음
    fireEvent.click(screen.getByText("내 정보 수정"));
    await waitFor(() => expect(pathname()).toMatch(/^\/profile\/.+\/edit$/));
    fireEvent.change(screen.getByLabelText("출생연도"), { target: { value: "1987" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(pathname()).toBe("/"));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("저장했어요"));
    free = await screen.findByTestId("free-tier");
    expect(within(free).getByText("올해는 받을 국가검진이 없어요")).toBeInTheDocument();
    expect(within(free).getByText(/다음 대상: 2027년/)).toBeInTheDocument();

    // 3) 엄마 추가 → 잠금 영역(광고 fail-open)에 계획 카드 3장
    fireEvent.click(await screen.findByRole("button", { name: "가족 추가" }));
    await waitFor(() => expect(pathname()).toBe("/profile/new"));
    fillProfile("엄마", "1960", "여성", "피부양자·세대원");
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    await waitFor(() => expect(pathname()).toBe("/"));
    const locked = await screen.findByTestId("locked-tier");
    expect(within(locked).getByText("엄마 · 올해 대상 5개")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^plan-year-/)).toHaveLength(3);
    expect(storedProfiles()).toHaveLength(2);

    // 4) 엄마 삭제 → Toast + 행 0개
    const momId = (storedProfiles() as { id: string; name: string }[]).find((p) => p.name === "엄마")!.id;
    // 가족 행 → 체크리스트 시트 → '정보 수정'으로 수정 화면에 들어간다.
    fireEvent.click(within(locked).getByText("엄마 · 올해 대상 5개"));
    fireEvent.click(await screen.findByRole("button", { name: "정보 수정" }));
    await waitFor(() => expect(pathname()).toBe(`/profile/${momId}/edit`));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const confirm = await screen.findAllByRole("button", { name: "삭제" });
    fireEvent.click(confirm[confirm.length - 1]);
    await waitFor(() => expect(pathname()).toBe("/"));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("삭제했어요"));
    await screen.findByTestId("locked-tier");
    expect(screen.queryAllByText(/엄마/)).toHaveLength(0);
    expect(storedProfiles()).toHaveLength(1);
  });
});

describe("종단 흐름: 손상 복구", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    mockOpenToast.mockReset();
  });

  it("profiles.v1이 깨져 있으면 안내 Toast 후 입력 화면에서 다시 시작한다", async () => {
    localStorage.setItem(KEYS.profiles, "{oops");
    renderApp("/");
    await waitFor(() => expect(pathname()).toBe("/profile/new"));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("저장된 정보를 불러오지 못해 새로 시작해요"));

    fillProfile("나", "1986", "남성", "직장가입자(사무직)");
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    await waitFor(() => expect(pathname()).toBe("/"));
    expect(within(await screen.findByTestId("free-tier")).getByText(/올해 대상\s*2개/)).toBeInTheDocument();
  });
});
