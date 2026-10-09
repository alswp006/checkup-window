import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { mockAnalytics, mockNavigate, mockOpenToast, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import { CheckupStoreProvider } from "@/data/CheckupStoreProvider";
import { CHECKUP_RULES, formatRuleLine } from "@/domain/rules";
import { KEYS } from "@/data/storage";
import HomeFooterActions from "@/components/home/HomeFooterActions";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

mockTds();
mockRouter();
mockAnalytics();

const NOW = "2026-10-10T00:00:00.000Z";
const SELF_ID = "self-1";

function seed() {
  localStorage.setItem(
    KEYS.profiles,
    JSON.stringify({
      version: 1,
      data: [
        { id: SELF_ID, name: "나", role: "self", birthYear: 1986, sex: "male", insuranceType: "employee_office", createdAt: NOW, updatedAt: NOW },
      ],
    }),
  );
  localStorage.setItem(KEYS.records, JSON.stringify({ version: 1, data: [] }));
  localStorage.setItem(KEYS.banner, JSON.stringify({ dismissedMonth: "2026-10" }));
}

function renderActions() {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(CheckupStoreProvider, null, React.createElement(HomeFooterActions, { selfId: SELF_ID })),
    ),
  );
}

describe("HomeFooterActions", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    seed();
    mockNavigate.mockReset();
    mockOpenToast.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("F8-AC-1: '내 정보 수정'을 탭하면 state 없이 /profile/{selfId}/edit로 이동한다", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /내 정보 수정/ }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/profile/self-1/edit");
  });

  it("F8-AC-4: '검진 기준과 출처'를 탭하면 BottomSheet에 규칙 7개 행이 보인다", () => {
    renderActions();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /검진 기준과 출처/ }));
    const sheet = screen.getByRole("dialog");
    expect(CHECKUP_RULES).toHaveLength(7);
    for (const rule of CHECKUP_RULES) {
      expect(within(sheet).getByText(formatRuleLine(rule.id))).toBeInTheDocument();
    }
  });

  it("F8-AC-4: 위암 행은 '위암 검진 · 만 40세 이상 · 2년마다 · 암관리법 시행령 별표1'이다", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /검진 기준과 출처/ }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("위암 검진 · 만 40세 이상 · 2년마다 · 암관리법 시행령 별표1")).toBeInTheDocument();
    expect(sheet.textContent).toContain("암관리법 시행령 별표1");
  });

  it("F8-AC-4: 출처 시트 안에 외부 링크(a[href^=http])가 0개다", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /검진 기준과 출처/ }));
    const sheet = screen.getByRole("dialog");
    expect(sheet.querySelectorAll('a[href^="http"]').length).toBe(0);
    expect(sheet.querySelectorAll("a").length).toBe(0);
  });

  it("F8-AC-6: '데이터 초기화'를 탭하면 확인 다이얼로그가 뜬다", () => {
    renderActions();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /데이터 초기화/ }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("모든 프로필과 체크 기록을 지울까요?")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "취소" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "초기화" })).toBeInTheDocument();
  });

  it("F8-AC-6: '초기화'를 누르면 키 3개가 지워지고 /profile/new로 replace 이동한다", async () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /데이터 초기화/ }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith("/profile/new", { replace: true, state: { mode: "self" } });
    expect(localStorage.getItem(KEYS.profiles)).toBeNull();
    expect(localStorage.getItem(KEYS.records)).toBeNull();
    expect(localStorage.getItem(KEYS.banner)).toBeNull();
    expect(mockOpenToast).not.toHaveBeenCalled();
  });

  it("F8-AC-6: 왼쪽 버튼 '닫기'를 누르면 데이터와 이동 모두 변화가 없다", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: /데이터 초기화/ }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEYS.profiles)).not.toBeNull();
    expect(localStorage.getItem(KEYS.records)).not.toBeNull();
    expect(localStorage.getItem(KEYS.banner)).not.toBeNull();
  });

  it("F8-AC-7: removeItem이 예외를 던지면 Toast를 띄우고 navigate·console.error는 0회다", async () => {
    renderActions();
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    fireEvent.click(screen.getByRole("button", { name: /데이터 초기화/ }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "초기화" }));
    await waitFor(() => expect(mockOpenToast).toHaveBeenCalledTimes(1));
    expect(mockOpenToast).toHaveBeenCalledWith("초기화하지 못했어요. 다시 시도해주세요");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    removeSpy.mockRestore();
    expect(localStorage.getItem(KEYS.profiles)).not.toBeNull();
  });
});
