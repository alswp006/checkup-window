import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { mockNavigate, mockOpenToast, mockTds } from "@/__tests__/__helpers__/mocks";
import { renderWithProviders } from "@/test/renderWithProviders";
import { CheckupStoreContext, type CheckupStore } from "@/data/useCheckupStore";
import { KEYS } from "@/data/storage";
import * as analytics from "@/lib/analytics";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));
vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  logClick: vi.fn(),
}));

mockTds();

// mocks.ts는 import만 해도 react-router-dom 목을 자기 것으로 덮는다 — import 뒤 doMock으로 다시 걸고 화면은 동적으로 읽는다.
let ProfileForm: React.ComponentType;

beforeAll(async () => {
  vi.doMock("react-router-dom", async () => ({
    ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
    useNavigate: () => mockNavigate,
  }));
  ProfileForm = (await import("@/pages/ProfileForm")).default;
});

const NOW = "2026-10-10T00:00:00.000Z";

const SELF = {
  id: "self-1", name: "나", role: "self", birthYear: 1986, sex: "male",
  insuranceType: "employee_office", createdAt: NOW, updatedAt: NOW,
};
const MOM = {
  id: "mom-1", name: "엄마", role: "family", birthYear: 1966, sex: "female",
  insuranceType: "employee_nonoffice", createdAt: NOW, updatedAt: NOW,
};

function seed(profiles: unknown[], records: unknown[] = []) {
  return {
    [KEYS.profiles]: JSON.stringify({ version: 1, data: profiles }),
    [KEYS.records]: JSON.stringify({ version: 1, data: records }),
    [KEYS.banner]: JSON.stringify({ dismissedMonth: null }),
  };
}

function routes() {
  return React.createElement(
    Routes,
    null,
    React.createElement(Route, { path: "/profile/new", element: React.createElement(ProfileForm) }),
    React.createElement(Route, { path: "/profile/:profileId/edit", element: React.createElement(ProfileForm) }),
  );
}

function renderAt(route: string, storage: Record<string, string>, state?: unknown) {
  return renderWithProviders(routes(), { route, state, storage });
}

function storedProfiles(): Array<Record<string, unknown>> {
  return JSON.parse(localStorage.getItem(KEYS.profiles) ?? '{"data":[]}').data;
}

function toastShown(text: string): boolean {
  return mockOpenToast.mock.calls.some((c) => String(c[0]?.text ?? c[0]).includes(text)) || screen.queryByText(text) !== null;
}

/** 이름·출생연도 칸은 라벨로 찾는다(labelOption="sustain"이라 빈 칸에도 라벨이 있다). */
function typeInto(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("프로필 입력·수정 화면 — ProfileForm + DeleteProfileButton", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    mockNavigate.mockReset();
    mockOpenToast.mockReset();
  });

  it("F3-AC-1[P0]: 나·1986·남성·직장가입자(사무직) 저장 → self 프로필 + 홈 replace 이동 + profile_submit 1회 + success 햅틱", async () => {
    renderAt("/profile/new", seed([]), { mode: "self" });

    expect(screen.getByText("내 정보 입력")).toBeInTheDocument();
    expect((screen.getByLabelText("이름") as HTMLInputElement).value).toBe("나");

    typeInto("출생연도", "1986");
    fireEvent.click(screen.getByRole("button", { name: "남성" }));
    fireEvent.click(screen.getByText("직장가입자(사무직)"));
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true, state: { toast: "saved" } }),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const saved = storedProfiles();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: "나", role: "self", birthYear: 1986, sex: "male", insuranceType: "employee_office" });
    expect(vi.mocked(analytics.logClick).mock.calls.filter((c) => c[0] === "profile_submit")).toHaveLength(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
  });

  it("F3-AC-1[P0] 오류: 출생연도를 비운 채 제출하면 저장·이동 없이 4자리 안내가 뜬다", async () => {
    renderAt("/profile/new", seed([]), { mode: "self" });

    fireEvent.click(screen.getByRole("button", { name: "남성" }));
    fireEvent.click(screen.getByText("직장가입자(사무직)"));
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(await screen.findByText("출생연도 4자리를 입력해주세요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(storedProfiles()).toHaveLength(0);
  });

  it("F3-AC-6·RS-AC-3[P0]: /profile/mom-1/edit은 엄마·1966·여성·유형이 채워지고 부제목 '정보 수정'·버튼 '저장'", async () => {
    renderAt("/profile/mom-1/edit", seed([SELF, MOM]));

    await waitFor(() => expect((screen.getByLabelText("이름") as HTMLInputElement).value).toBe("엄마"));
    expect((screen.getByLabelText("출생연도") as HTMLInputElement).value).toBe("1966");
    expect(screen.getByRole("button", { name: "여성" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "남성" })).toHaveAttribute("aria-pressed", "false");
    expect(within(screen.getByRole("group", { name: "가입 유형" })).getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(screen.getByText("정보 수정")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("F3-AC-6·RS-AC-3[P0] 오류: 없는 id면 홈으로 replace 이동하고, loading 동안은 Loader만 보인다", async () => {
    renderAt("/profile/ghost/edit", seed([SELF]));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
  });

  it("F3-AC-6[P0]: status가 'loading'이면 Loader만 보이고 폼도 이동도 없다", () => {
    const loadingStore: CheckupStore = {
      status: "loading", profiles: [], records: [], banner: { dismissedMonth: null }, recovered: false,
      addProfile: vi.fn(), updateProfile: vi.fn(), deleteProfile: vi.fn(),
      toggleRecord: vi.fn(), dismissBanner: vi.fn(), resetAll: vi.fn(),
    } as unknown as CheckupStore;
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/profile/mom-1/edit"] },
        React.createElement(CheckupStoreContext.Provider, { value: loadingStore }, routes()),
      ),
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByLabelText("출생연도")).toBeNull();
    expect(screen.queryByRole("button", { name: "저장" })).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("F3-AC-7[P0]: STORAGE_FULL이면 Toast를 띄우고 이동하지 않으며 입력값이 유지된다", async () => {
    renderAt("/profile/new", seed([]), { mode: "self" });

    typeInto("출생연도", "1986");
    fireEvent.click(screen.getByRole("button", { name: "남성" }));
    fireEvent.click(screen.getByText("직장가입자(사무직)"));

    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    await waitFor(() => expect(toastShown("저장 공간이 부족해 저장하지 못했어요")).toBe(true));
    spy.mockRestore();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect((screen.getByLabelText("출생연도") as HTMLInputElement).value).toBe("1986");
    expect(screen.getByRole("button", { name: "남성" })).toHaveAttribute("aria-pressed", "true");
    expect(storedProfiles()).toHaveLength(0);
  });

  it("F8-AC-2·3[P0]: 가족 수정에서 삭제 → 확인 문구 → 삭제하면 프로필·기록 삭제 + deleted 이동 + profile_delete 로그", async () => {
    const record = { profileId: "mom-1", itemId: "general", year: 2026, receivedAt: NOW };
    renderAt("/profile/mom-1/edit", seed([SELF, MOM], [record]));

    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("엄마 프로필을 삭제할까요?");
    expect(dialog.textContent).toContain("체크 기록도 함께 지워져요");
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true, state: { toast: "deleted" } }),
    );
    expect(storedProfiles().map((p) => p.id)).toEqual(["self-1"]);
    expect(JSON.parse(localStorage.getItem(KEYS.records) ?? '{"data":[]}').data).toHaveLength(0);
    expect(vi.mocked(analytics.logClick).mock.calls.filter((c) => c[0] === "profile_delete")).toHaveLength(1);
  });

  it("F8-AC-2[P0] 오류: 다이얼로그에서 '닫기'를 누르면 프로필·이동·로그가 그대로다", async () => {
    renderAt("/profile/mom-1/edit", seed([SELF, MOM]));

    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(storedProfiles().map((p) => p.id)).toEqual(["self-1", "mom-1"]);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(vi.mocked(analytics.logClick).mock.calls.filter((c) => c[0] === "profile_delete")).toHaveLength(0);
  });

  it("F8-AC-3[P0]: self 수정 화면에는 삭제 Button이 0개이고 저장하면 saved로 이동한다 (F8-AC-1)", async () => {
    renderAt("/profile/self-1/edit", seed([SELF, MOM]));

    await waitFor(() => expect((screen.getByLabelText("출생연도") as HTMLInputElement).value).toBe("1986"));
    expect(screen.queryAllByRole("button", { name: "삭제" })).toHaveLength(0);

    typeInto("출생연도", "1987");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true, state: { toast: "saved" } }),
    );
    expect(storedProfiles().find((p) => p.id === "self-1")).toMatchObject({ birthYear: 1987, role: "self" });
  });

  it("RS-AC-2·4[P0]: state 없이 진입하면 self 유무로 추론한다 — 없으면 '내 정보 입력', 있으면 '가족 추가'", () => {
    const first = renderAt("/profile/new", seed([]));
    expect(screen.getByText("내 정보 입력")).toBeInTheDocument();
    expect(screen.queryByText("가족 추가")).toBeNull();
    first.unmount();
    localStorage.clear();

    renderAt("/profile/new", seed([SELF]));
    return waitFor(() => expect(screen.getByText("가족 추가")).toBeInTheDocument()).then(() => {
      expect(screen.queryByText("내 정보 입력")).toBeNull();
      expect(screen.getByRole("button", { name: "결과 보기" })).toBeInTheDocument();
    });
  });

  it("RS-AC-4[P0] 오류: state가 {mode:1}처럼 모양이 틀려도 크래시 없이 null로 보고 추론한다", async () => {
    renderAt("/profile/new", seed([SELF]), { mode: 1 });

    await waitFor(() => expect(screen.getByText("가족 추가")).toBeInTheDocument());
    expect(screen.queryByText("내 정보 입력")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
