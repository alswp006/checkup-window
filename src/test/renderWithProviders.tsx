import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CheckupStoreProvider } from "@/data/CheckupStoreProvider";

export interface RenderWithProvidersOptions {
  route?: string;
  /** location.state로 넘길 값 */
  state?: unknown;
  /** 렌더 전에 localStorage에 심을 키-값 */
  storage?: Record<string, string>;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { route = "/", state, storage } = options;
  if (storage) {
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }
  return render(
    // React Router는 initialEntries[0]의 state를 버린다(첫 항목은 항상 state null) — 그래서 진입
    // state를 살리려면 첫 항목 뒤에 실제 진입 항목을 둔다.
    <MemoryRouter initialEntries={[{ pathname: "/", state: null }, { pathname: route, state }]} initialIndex={1}>
      <CheckupStoreProvider>{ui}</CheckupStoreProvider>
    </MemoryRouter>,
  );
}
