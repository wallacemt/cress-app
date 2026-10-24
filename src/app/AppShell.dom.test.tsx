// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { AppShell } from "./AppShell";

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/repertoire" element={<p>Repertoire page</p>} />
          <Route path="/sessions" element={<p>Sessions page</p>} />
          <Route path="/tools" element={<p>Tools page</p>} />
          <Route path="/practice/:sessionId" element={<p>Practice page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell navigation rail", () => {
  afterEach(cleanup);

  it("renders the four destinations with their approved labels", () => {
    renderShell("/");
    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Repertório" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sessões" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Prática livre" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Configurações" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
  });

  it("marks the current destination with aria-current=page", () => {
    renderShell("/repertoire");
    expect(
      screen
        .getByRole("link", { name: "Repertório" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("does not render the rail in workspace routes", () => {
    renderShell("/practice/session-1");
    expect(
      screen.queryByRole("navigation", { name: "Navegação principal" }),
    ).toBeNull();
  });
});
