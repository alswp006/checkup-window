import { describe, it, expect } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { useCheckupStore } from "@/data/useCheckupStore";

let latest: ReturnType<typeof useCheckupStore> | null = null;

function Probe() {
  latest = useCheckupStore();
  return <div data-testid="probe">{`${latest.status}:${latest.profiles.length}:${latest.records.length}`}</div>;
}

describe("CheckupStoreProvider", () => {
  it("toggleRecord·dismissBanner·resetAll이 상태에 반영된다", async () => {
    renderWithProviders(<Probe />);
    await waitFor(() => expect(latest?.status).toBe("ready"));
    act(() => {
      latest?.addProfile({ name: "민지", role: "self", birthYear: 1985, sex: "female", insuranceType: "employee_office" });
    });
    const id = latest!.profiles[0].id;
    act(() => {
      latest?.toggleRecord(id, "general", 2026);
    });
    expect(screen.getByTestId("probe").textContent).toBe("ready:1:1");
    act(() => {
      latest?.dismissBanner("2026-09");
    });
    expect(latest?.banner.dismissedMonth).toBe("2026-09");
    act(() => {
      latest?.resetAll();
    });
    expect(screen.getByTestId("probe").textContent).toBe("ready:0:0");
    expect(latest?.banner.dismissedMonth).toBeNull();
  });
});
