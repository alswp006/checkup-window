import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { useCheckupStore } from "@/data/useCheckupStore";
import { renderWithProviders } from "@/test/renderWithProviders";

type Store = ReturnType<typeof useCheckupStore>;

const KEY_PROFILES = "checkupWindow.profiles.v1";
const KEY_RECORDS = "checkupWindow.records.v1";

const selfInput = {
  name: "민지",
  role: "self" as const,
  birthYear: 1985,
  sex: "female" as const,
  insuranceType: "employee_office" as const,
};

function makeProbe() {
  const seen: string[] = [];
  let latest: Store | null = null;
  function Probe() {
    const store = useCheckupStore();
    latest = store;
    seen.push(store.status);
    return React.createElement(
      "div",
      { "data-testid": "probe" },
      `${store.status}:${store.profiles.length}:${store.records.length}:${String(store.recovered)}`,
    );
  }
  return { Probe, seen, get: () => latest as Store };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-20T09:00:00+09:00"));
});

describe("상태 관리 — CheckupStoreProvider·useCheckupStore", () => {
  it("F2-AC-7: 첫 렌더는 loading, 읽기 후 ready이며 저장값이 없으면 빈 배열이다", async () => {
    const p = makeProbe();
    renderWithProviders(React.createElement(p.Probe));
    expect(p.seen[0]).toBe("loading");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("ready:0:0:false"));
    expect(p.get().profiles).toEqual([]);
    expect(p.get().records).toEqual([]);
    expect(p.get().banner).toEqual({ dismissedMonth: null });
  });

  it("F2-AC-7: 저장된 프로필과 기록을 ready 시점에 불러온다", async () => {
    const profile = {
      id: "p1",
      name: "민지",
      role: "self",
      birthYear: 1985,
      sex: "female",
      insuranceType: "employee_office",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const record = { profileId: "p1", itemId: "general", year: 2026, receivedAt: "2026-03-01T00:00:00.000Z" };
    const p = makeProbe();
    renderWithProviders(React.createElement(p.Probe), {
      storage: {
        [KEY_PROFILES]: JSON.stringify({ version: 1, data: [profile] }),
        [KEY_RECORDS]: JSON.stringify({ version: 1, data: [record] }),
      },
    });
    expect(p.seen[0]).toBe("loading");
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("ready:1:1:false"));
    expect(p.get().profiles[0].name).toBe("민지");
    expect(p.get().records[0].itemId).toBe("general");
  });

  it("F2-AC-4·DV-AC-1: 범위 밖 birthYear가 저장돼 있으면 ready, profiles [], recovered true", async () => {
    const bad = {
      id: "p1",
      name: "민지",
      role: "self",
      birthYear: 1800,
      sex: "female",
      insuranceType: "employee_office",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const p = makeProbe();
    renderWithProviders(React.createElement(p.Probe), {
      storage: { [KEY_PROFILES]: JSON.stringify({ version: 1, data: [bad] }) },
    });
    await waitFor(() => expect(p.get().status).toBe("ready"));
    expect(p.get().profiles).toEqual([]);
    expect(p.get().recovered).toBe(true);
  });

  it("F2-AC-4: 손상된 JSON이 저장돼 있어도 ready, profiles [], recovered true", async () => {
    const p = makeProbe();
    renderWithProviders(React.createElement(p.Probe), {
      storage: { [KEY_PROFILES]: "{not json" },
    });
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("ready:0:0:true"));
    expect(p.get().recovered).toBe(true);
  });

  it("F2-AC-5: 저장 성공 시 addProfile은 ok를 돌려주고 profiles에 반영된다", async () => {
    const p = makeProbe();
    renderWithProviders(React.createElement(p.Probe));
    await waitFor(() => expect(p.get().status).toBe("ready"));
    let res: unknown;
    act(() => {
      res = p.get().addProfile(selfInput);
    });
    expect(res).toEqual({ ok: true });
    expect(screen.getByTestId("probe").textContent).toBe("ready:1:0:false");
    expect(p.get().profiles[0].name).toBe("민지");
  });

  it("F2-AC-5: setItem이 QuotaExceededError면 addProfile은 STORAGE_FULL이고 profiles는 그대로다", async () => {
    const p = makeProbe();
    renderWithProviders(React.createElement(p.Probe));
    await waitFor(() => expect(p.get().status).toBe("ready"));
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    let res: unknown;
    act(() => {
      res = p.get().addProfile(selfInput);
    });
    spy.mockRestore();
    expect(res).toEqual({ ok: false, error: "STORAGE_FULL" });
    expect(p.get().profiles).toHaveLength(0);
    expect(screen.getByTestId("probe").textContent).toBe("ready:0:0:false");
  });

  it("AC-4: Provider 밖에서 useCheckupStore를 호출하면 에러를 던진다", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bare() {
      useCheckupStore();
      return null;
    }
    expect(() => render(React.createElement(Bare))).toThrow(
      "useCheckupStore must be used within CheckupStoreProvider",
    );
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("AC-5: renderWithProviders는 route·state·storage 시드를 적용한다", async () => {
    function Where() {
      const loc = useLocation();
      const store = useCheckupStore();
      return React.createElement(
        "div",
        { "data-testid": "where" },
        `${loc.pathname}|${JSON.stringify(loc.state)}|${store.banner.dismissedMonth}`,
      );
    }
    renderWithProviders(React.createElement(Where), {
      route: "/result/p1",
      state: { from: "home" },
      storage: { "checkupWindow.banner.v1": JSON.stringify({ dismissedMonth: "2026-09" }) },
    });
    await waitFor(() =>
      expect(screen.getByTestId("where").textContent).toBe('/result/p1|{"from":"home"}|2026-09'),
    );
    expect(localStorage.getItem("checkupWindow.banner.v1")).toBe(JSON.stringify({ dismissedMonth: "2026-09" }));
  });
});
