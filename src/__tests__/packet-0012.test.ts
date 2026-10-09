import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { mockLocation, mockNavigate, mockOpenToast, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import type { Profile } from "@/lib/types";
import { useHomeBootstrap } from "@/pages/home/useHomeBootstrap";

mockTds();
mockRouter();

const NOW = "2026-10-10T00:00:00.000Z";

const storeState: {
  status: "loading" | "ready";
  profiles: Profile[];
  records: [];
  recovered: boolean;
} = { status: "ready", profiles: [], records: [], recovered: false };

vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => storeState,
}));

function profile(over: Partial<Profile>): Profile {
  return {
    id: "self-1",
    name: "나",
    role: "self",
    birthYear: 1986,
    sex: "male",
    insuranceType: "employee_office",
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

function run() {
  return renderHook(() => useHomeBootstrap(), {
    wrapper: ({ children }: { children: React.ReactNode }) => React.createElement(MemoryRouter, null, children),
  });
}

describe("홈 부트스트랩 훅 — useHomeBootstrap", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    mockNavigate.mockReset();
    mockOpenToast.mockReset();
    mockLocation.state = null;
    storeState.status = "ready";
    storeState.profiles = [];
    storeState.recovered = false;
  });

  it("F4-AC-4: status가 loading이면 phase는 loading이고 navigate는 호출되지 않는다", () => {
    storeState.status = "loading";
    const { result } = run();
    expect(result.current.phase).toBe("loading");
    expect(mockNavigate).toHaveBeenCalledTimes(0);
  });

  it("F4-AC-5: ready이고 self가 없으면 /profile/new로 replace 이동한다", () => {
    storeState.profiles = [profile({ id: "fam-1", name: "어머니", role: "family", birthYear: 1960, sex: "female" })];
    const { result } = run();
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/profile/new", { replace: true, state: { mode: "self" } });
    expect(result.current.phase).toBe("redirect");
  });

  it("F4-AC-5: self가 있으면 phase는 ready이고 self와 selfResult를 돌려준다", () => {
    storeState.profiles = [profile({}), profile({ id: "fam-1", name: "어머니", role: "family", birthYear: 1960, sex: "female" })];
    const { result } = run();
    expect(result.current.phase).toBe("ready");
    expect(result.current.self?.id).toBe("self-1");
    expect(result.current.selfResult?.profileId).toBe("self-1");
    expect(result.current.family.map((p) => p.id)).toEqual(["fam-1"]);
    expect(result.current.familyResults.map((r) => r.profileId)).toEqual(["fam-1"]);
    expect(result.current.invalidFamily).toEqual([]);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("F4-AC-6·RS-AC-4: toast saved면 '저장했어요'를 1회 띄우고 state를 비운다", () => {
    storeState.profiles = [profile({})];
    mockLocation.state = { toast: "saved" } as never;
    run();
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith("저장했어요");
    expect(mockNavigate).toHaveBeenCalledWith(".", { replace: true, state: null });
  });

  it("F4-AC-6·RS-AC-4: toast deleted면 '삭제했어요'를 1회 띄우고 state를 비운다", () => {
    storeState.profiles = [profile({})];
    mockLocation.state = { toast: "deleted" } as never;
    run();
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith("삭제했어요");
    expect(mockNavigate).toHaveBeenCalledWith(".", { replace: true, state: null });
  });

  it("F4-AC-6: 모양이 틀린 state({toast:'xyz'})나 state 없음은 토스트 0회, 크래시 없음", () => {
    storeState.profiles = [profile({})];
    mockLocation.state = { toast: "xyz" } as never;
    const first = run();
    expect(first.result.current.phase).toBe("ready");
    expect(mockOpenToast).toHaveBeenCalledTimes(0);
    first.unmount();

    mockLocation.state = null;
    const second = run();
    expect(second.result.current.phase).toBe("ready");
    expect(mockOpenToast).toHaveBeenCalledTimes(0);
    expect(mockNavigate).not.toHaveBeenCalledWith(".", expect.anything());
  });

  it("F2-AC-4: recovered가 true면 복구 토스트를 마운트당 1회만 띄운다", () => {
    storeState.profiles = [profile({})];
    storeState.recovered = true;
    const { rerender } = run();
    rerender();
    rerender();
    expect(mockOpenToast).toHaveBeenCalledTimes(1);
    expect(mockOpenToast).toHaveBeenCalledWith("저장된 정보를 불러오지 못해 새로 시작해요");
  });

  it("DV-AC-2: birthYear 1900인 self는 throw 없이 /profile/{id}/edit로 replace 이동한다", () => {
    storeState.profiles = [profile({ id: "self-bad", birthYear: 1900 })];
    let hook: ReturnType<typeof run>;
    expect(() => {
      hook = run();
    }).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/profile/self-bad/edit", { replace: true });
    expect(hook!.result.current.phase).toBe("redirect");
  });

  it("DV-AC-2: 같은 상태의 가족은 invalidFamily에 이름과 함께 남고 familyResults에서 빠진다", () => {
    storeState.profiles = [
      profile({}),
      profile({ id: "fam-bad", name: "할아버지", role: "family", birthYear: 1900 }),
      profile({ id: "fam-ok", name: "어머니", role: "family", birthYear: 1960, sex: "female" }),
    ];
    const { result } = run();
    expect(result.current.invalidFamily).toHaveLength(1);
    expect(result.current.invalidFamily[0]).toMatchObject({ id: "fam-bad", name: "할아버지" });
    expect(result.current.familyResults.map((r) => r.profileId)).toEqual(["fam-ok"]);
  });
});
