import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useParams } from "react-router-dom";
import { useCheckupStore } from "@/data/useCheckupStore";
import App from "@/App";

// 화면은 대역으로 바꿔 라우트 매핑·Provider 배선만 본다. 대역이 useCheckupStore를 부르므로
// App이 CheckupStoreProvider로 감싸지 않았으면 렌더가 던진다.
vi.mock("@/pages/Home", () => ({
  default: function HomeStub() {
    const store = useCheckupStore();
    return <div data-testid="page-home">{store.status}</div>;
  },
}));
vi.mock("@/pages/ProfileForm", () => ({
  default: function ProfileFormStub() {
    useCheckupStore();
    const { profileId } = useParams();
    return <div data-testid="page-profile-form">{profileId ?? "new"}</div>;
  },
}));

function LocationProbe() {
  return <div data-testid="probe">{useLocation().pathname}</div>;
}

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("App 라우팅", () => {
  it("'/'는 Home을 CheckupStoreProvider 안에서 그린다", async () => {
    renderAt("/");
    expect(await screen.findByTestId("page-home")).toHaveTextContent("ready");
  });

  it("'/profile/new'는 ProfileForm(신규)을 그린다", () => {
    renderAt("/profile/new");
    expect(screen.getByTestId("page-profile-form")).toHaveTextContent("new");
  });

  it("'/profile/:profileId/edit'는 profileId를 ProfileForm에 넘긴다", () => {
    renderAt("/profile/self-1/edit");
    expect(screen.getByTestId("page-profile-form")).toHaveTextContent("self-1");
  });

  it.each(["/profile//edit", "/unknown", "/profile"])("'%s'는 '/'로 보낸다", async (route) => {
    renderAt(route);
    await waitFor(() => expect(screen.getByTestId("probe")).toHaveTextContent(/^\/$/));
    expect(screen.getByTestId("page-home")).toBeInTheDocument();
    expect(screen.queryByTestId("page-profile-form")).toBeNull();
  });
});
