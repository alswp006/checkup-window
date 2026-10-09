import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { mockNavigate, mockOpenToast, mockTds } from "@/__tests__/__helpers__/mocks";
import { renderWithProviders } from "@/test/renderWithProviders";
import { KEYS } from "@/data/storage";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

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

function person(i: number, role: "self" | "family") {
  return {
    id: `p-${i}`, name: role === "self" ? "나" : `가족${i}`, role, birthYear: 1970, sex: "female",
    insuranceType: "dependent", createdAt: NOW, updatedAt: NOW,
  };
}

function seed(profiles: unknown[]) {
  return {
    [KEYS.profiles]: JSON.stringify({ version: 1, data: profiles }),
    [KEYS.records]: JSON.stringify({ version: 1, data: [] }),
    [KEYS.banner]: JSON.stringify({ dismissedMonth: null }),
  };
}

function renderForm(route: string, storage: Record<string, string>, state?: unknown) {
  return renderWithProviders(
    <Routes>
      <Route path="/profile/new" element={<ProfileForm />} />
      <Route path="/profile/:profileId/edit" element={<ProfileForm />} />
    </Routes>,
    { route, state, storage },
  );
}

describe("ProfileForm", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockOpenToast.mockReset();
  });

  it("가족이 9명이면 추가 버튼이 비활성이고 한도 안내가 보인다", async () => {
    const family = Array.from({ length: 9 }, (_, i) => person(i + 1, "family"));
    renderForm("/profile/new", seed([person(0, "self"), ...family]), { mode: "family" });

    await waitFor(() => expect(screen.getByText("가족 추가")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "결과 보기" })).toBeDisabled();
    expect(screen.getByText("가족은 최대 9명까지 추가할 수 있어요")).toBeInTheDocument();
  });

  it("같은 이름의 가족을 추가하면 이름 칸에 중복 안내가 뜨고 이동하지 않는다", async () => {
    renderForm("/profile/new", seed([person(0, "self"), person(1, "family")]), { mode: "family" });

    await waitFor(() => expect(screen.getByText("가족 추가")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "가족1" } });
    fireEvent.change(screen.getByLabelText("출생연도"), { target: { value: "1960" } });
    fireEvent.click(screen.getByRole("button", { name: "여성" }));
    fireEvent.click(screen.getByText("직장가입자(사무직)"));
    fireEvent.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(await screen.findByText("이미 같은 이름의 프로필이 있어요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("가족 수정 화면에만 삭제 버튼이 있다", async () => {
    renderForm("/profile/p-1/edit", seed([person(0, "self"), person(1, "family")]));
    await waitFor(() => expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument());
  });
});
