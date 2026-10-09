import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { mockOpenToast, mockTds } from "@/__tests__/__helpers__/mocks";
import { KEYS } from "@/data/storage";

mockTds();

// mocks.ts는 import만 해도 react-router-dom 목(useNavigate 스텁)을 호이스팅한다 — 종단 시나리오는 진짜 라우터가 필요하므로
// import 뒤 beforeAll에서 실제 모듈로 다시 걸고 App은 그 뒤에 동적으로 읽는다. CheckupStoreProvider는 목킹하지 않는다
// (App이 스스로 감싸는지가 이 패킷의 검증 대상이다).
let App: React.ComponentType;

beforeAll(async () => {
  vi.doMock("react-router-dom", async () => await vi.importActual<typeof import("react-router-dom")>("react-router-dom"));
  App = (await import("@/App")).default;
});

const NOW = "2026-10-10T00:00:00.000Z";

type Seed = { id: string; name: string; role: "self" | "family"; birthYear: number; sex: "male" | "female"; insuranceType: string };

function person(p: Seed) {
  return { ...p, createdAt: NOW, updatedAt: NOW };
}

const SELF_1986: Seed = { id: "self-1", name: "나", role: "self", birthYear: 1986, sex: "male", insuranceType: "employee_office" };
const MOM: Seed = { id: "fam-mom", name: "엄마", role: "family", birthYear: 1960, sex: "female", insuranceType: "dependent" };

function seed(profiles: Seed[]): Record<string, string> {
  return {
    [KEYS.profiles]: JSON.stringify({ version: 1, data: profiles.map(person) }),
    [KEYS.records]: JSON.stringify({ version: 1, data: [] }),
    // 지난달에 닫은 배너 — 이번 달에는 다시 떠도 단언에 영향이 없다.
    [KEYS.banner]: JSON.stringify({ dismissedMonth: "2026-09" }),
  };
}

function LocationProbe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "probe" }, loc.pathname);
}

/** 첫 항목 뒤에 실제 진입 항목을 둔다 — 첫 항목의 state는 라우터가 버린다. */
function renderApp(route = "/", storage: Record<string, string> = {}) {
  for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/", route], initialIndex: route === "/" ? 0 : 1 },
      React.createElement(App),
      React.createElement(LocationProbe),
    ),
  );
}

const pathname = () => screen.getByTestId("probe").textContent;

function fillProfile(name: string, birthYear: string, sex: "남성" | "여성", insurance: string) {
  fireEvent.change(screen.getByLabelText("이름"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("출생연도"), { target: { value: birthYear } });
  fireEvent.click(screen.getByRole("button", { name: sex }));
  fireEvent.click(screen.getByText(insurance));
}

describe("라우팅 연결 + 전역 Provider 배선 + 종단 시나리오 (App.tsx 단일 소유)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    mockOpenToast.mockReset();
  });

  it("AC-1[P0]: 빈 저장소 '/' → /profile/new, 1986 남성 직장(사무직) 제출 → 홈에 대상 2개·D-82", async () => {
    renderApp("/");
    await waitFor(() => expect(pathname()).toBe("/profile/new"));

    fillProfile("나", "1986", "남성", "직장가입자(사무직)");
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    await waitFor(() => expect(pathname()).toBe("/"));
    const free = await screen.findByTestId("free-tier");
    expect(within(free).getByText("일반건강검진")).toBeInTheDocument();
    expect(within(free).getByText("위암 검진")).toBeInTheDocument();
    expect(within(free).getByText("간암 검진")).toBeInTheDocument();
    expect(within(free).getByText(/올해 대상\s*2개/)).toBeInTheDocument();
    expect(screen.getAllByText(/D-82/).length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem(KEYS.profiles) ?? "{}").data).toHaveLength(1);
  });

  it("AC-1[P0]: 출생연도를 비운 채 제출하면 이동·저장 없이 /profile/new에 머문다", async () => {
    renderApp("/");
    await waitFor(() => expect(pathname()).toBe("/profile/new"));

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "나" } });
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(pathname()).toBe("/profile/new");
    expect(screen.queryByTestId("free-tier")).toBeNull();
    expect(localStorage.getItem(KEYS.profiles)).toBeNull();
  });

  it("AC-2[P0]: '내 정보 수정'에서 1987로 저장하면 Toast '저장했어요' + 올해 대상 없음·다음 대상 2027년", async () => {
    renderApp("/", seed([SELF_1986]));
    await screen.findByTestId("free-tier");

    fireEvent.click(screen.getByText("내 정보 수정"));
    await waitFor(() => expect(pathname()).toBe("/profile/self-1/edit"));

    fireEvent.change(screen.getByLabelText("출생연도"), { target: { value: "1987" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(pathname()).toBe("/"));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("저장했어요"));
    const free = await screen.findByTestId("free-tier");
    expect(within(free).getByText("올해는 받을 국가검진이 없어요")).toBeInTheDocument();
    expect(within(free).getByText(/다음 대상: 2027년/)).toBeInTheDocument();
  });

  it("AC-3[P0]: 엄마·아빠를 추가하면 3년 계획 카드 3장과 '엄마 · 올해 대상 5개'가 보인다", async () => {
    renderApp("/", seed([SELF_1986]));
    await screen.findByTestId("locked-tier");

    fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
    await waitFor(() => expect(pathname()).toBe("/profile/new"));
    fillProfile("엄마", "1960", "여성", "피부양자·세대원");
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    await waitFor(() => expect(pathname()).toBe("/"));

    fireEvent.click(await screen.findByRole("button", { name: "가족 추가" }));
    await waitFor(() => expect(pathname()).toBe("/profile/new"));
    fillProfile("아빠", "1958", "남성", "직장가입자(비사무직)");
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));
    await waitFor(() => expect(pathname()).toBe("/"));

    const locked = await screen.findByTestId("locked-tier");
    expect(screen.getAllByTestId(/^plan-year-/)).toHaveLength(3);
    expect(within(locked).getByText("엄마 · 올해 대상 5개")).toBeInTheDocument();
    expect(within(locked).getByText(/^아빠 · /)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(KEYS.profiles) ?? "{}").data).toHaveLength(3);
  });

  it("AC-3[P0]: 엄마를 삭제하면 Toast '삭제했어요'가 뜨고 엄마 행이 0개가 된다", async () => {
    renderApp("/profile/fam-mom/edit", seed([SELF_1986, MOM]));
    await screen.findByRole("button", { name: "삭제" });

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const buttons = await screen.findAllByRole("button", { name: "삭제" });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(pathname()).toBe("/"));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("삭제했어요"));
    await screen.findByTestId("locked-tier");
    expect(screen.queryAllByText(/엄마/)).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(KEYS.profiles) ?? "{}").data).toHaveLength(1);
  });

  it("AC-4[P0]: profiles.v1이 '{oops'면 복구 Toast를 띄우고 /profile/new로 간다", async () => {
    renderApp("/", { [KEYS.profiles]: "{oops" });

    await waitFor(() => expect(pathname()).toBe("/profile/new"));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledWith("저장된 정보를 불러오지 못해 새로 시작해요"));
    expect(screen.getByLabelText("출생연도")).toBeInTheDocument();
  });

  it.each(["/profile//edit", "/unknown"])("AC-4[P0]: '%s' 직접 진입은 크래시 없이 '/'로 간다", async (route) => {
    renderApp(route, seed([SELF_1986]));

    await waitFor(() => expect(pathname()).toBe("/"));
    const free = await screen.findByTestId("free-tier");
    expect(within(free).getByText(/올해 대상\s*2개/)).toBeInTheDocument();
    expect(screen.queryByLabelText("출생연도")).toBeNull();
  });

  it("AC-5[P0]: 1986 시드로 홈을 그리는 동안 console.error는 0회다", async () => {
    const errorSpy = vi.spyOn(console, "error");
    renderApp("/", seed([SELF_1986]));

    const free = await screen.findByTestId("free-tier");
    await screen.findByTestId("locked-tier");
    expect(within(free).getByText("일반건강검진")).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledTimes(0);
    errorSpy.mockRestore();
  });
});
