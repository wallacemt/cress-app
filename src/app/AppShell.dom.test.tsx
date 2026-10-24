// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { AppShell } from "./AppShell";
import { useProfileStore } from "../stores/profileStore";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<p>Dashboard content</p>} />
          <Route path="/repertoire" element={<p>Repertório content</p>} />
          <Route path="/sessions" element={<p>Sessões content</p>} />
          <Route path="/practice/new" element={<p>Workspace content</p>} />
          <Route path="/practice/:sessionId" element={<p>Workspace content</p>} />
          <Route path="/tools" element={<p>Workspace content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell navigation", () => {
  afterEach(() => {
    cleanup();
    useProfileStore.getState().setProfile(null);
  });

  it("marks the current destination and shows profile initials", () => {
    useProfileStore.getState().setProfile({
      displayName: "Ana Maria",
      instruments: ["violin"],
      primaryInstrument: "violin",
      musicalRoles: [],
      onboardedAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    renderAt("/repertoire");
    expect(screen.getByRole("link", { name: "Repertório" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Início" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Configurações" }).textContent).toBe("AM");
  });

  it.each(["/tools", "/practice/new", "/practice/session-1"])("hides navigation in Workspace at %s", (path) => {
    renderAt(path);
    expect(screen.queryByRole("navigation", { name: "Navegação principal" })).toBeNull();
  });

  it("shows the Atril outside Workspace", () => {
    renderAt("/");
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Prática livre" }).getAttribute("href")).toBe("/tools");
  });

  it("navigates to free practice", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Prática livre" }));
    expect(await screen.findByText("Workspace content")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Navegação principal" })).toBeNull();
  });

  it("hides on downward scroll and returns on upward scroll", () => {
    renderAt("/");
    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 120 });
    fireEvent.scroll(window);
    expect(navigation.classList.contains("atril-hidden")).toBe(true);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 80 });
    fireEvent.scroll(window);
    expect(navigation.classList.contains("atril-hidden")).toBe(false);
  });

  it("keeps navigation visible while it contains keyboard focus", () => {
    renderAt("/");
    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    screen.getByRole("link", { name: "Início" }).focus();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 120 });
    fireEvent.scroll(window);
    expect(navigation.classList.contains("atril-hidden")).toBe(false);
  });

  // jsdom não simula backdrop-filter; o fallback de transparência fica garantido por CSS.
});
