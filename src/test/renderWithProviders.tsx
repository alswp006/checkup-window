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
    <MemoryRouter initialEntries={[{ pathname: route, state }]}>
      <CheckupStoreProvider>{ui}</CheckupStoreProvider>
    </MemoryRouter>,
  );
}
