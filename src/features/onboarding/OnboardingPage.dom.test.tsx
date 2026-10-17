// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";

const { completeOnboarding, getDeps } = vi.hoisted(() => ({
  completeOnboarding: vi.fn(),
  getDeps: vi.fn(),
}));
vi.mock("../../application/profile", () => ({ completeOnboarding }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { OnboardingPage } from "./OnboardingPage";

const deps = {} as Deps;
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/onboarding"]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={<p>Início</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OnboardingPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    completeOnboarding.mockReset().mockResolvedValue({});
    getDeps.mockReset().mockResolvedValue(deps);
  });

  it("blocks the name step when the required name is empty", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("alert").textContent).toContain("Informe seu nome.");
    expect(screen.getByText("Passo 2 de 6")).toBeTruthy();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("persists only on the final action and navigates after success", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Seu nome" }), {
      target: { value: "Ana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Violino" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Passo 6 de 6")).toBeTruthy();
    expect(completeOnboarding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Entrar no Cress" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledOnce());
    expect(completeOnboarding).toHaveBeenCalledWith(deps, {
      displayName: "Ana",
      instruments: ["violin"],
      primaryInstrument: "violin",
      otherInstrumentLabel: null,
      experienceLevel: undefined,
      musicalRoles: [],
      ensembleName: null,
      a4: 440,
      noteNaming: "letter",
    });
    expect(await screen.findByText("Início")).toBeTruthy();
  });
});
