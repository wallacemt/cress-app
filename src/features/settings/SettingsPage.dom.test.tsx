// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "../../domain/profile";
import type { Deps } from "../../application/deps";

const { saveProfile, getDeps } = vi.hoisted(() => ({ saveProfile: vi.fn(), getDeps: vi.fn() }));
vi.mock("../../application/profile", () => ({ saveProfile }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { SettingsPage } from "./SettingsPage";
import { UpdateCheckProvider } from "../updates/UpdateCheckProvider";
import { useProfileStore } from "../../stores/profileStore";

const profile: UserProfile = {
  displayName: "Ana",
  instruments: ["violin", "other"],
  primaryInstrument: "violin",
  otherInstrumentLabel: "Bandolim",
  experienceLevel: "intermediate",
  musicalRoles: ["orchestra", "student"],
  ensembleName: "Orquestra Jovem",
  onboardedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};
const db = { select: vi.fn().mockResolvedValue([]) } as unknown as Deps["db"];
const deps = { db } as Deps;

const renderSettings = () => render(<UpdateCheckProvider><SettingsPage /></UpdateCheckProvider>);

describe("SettingsPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    useProfileStore.getState().setProfile(profile);
    saveProfile.mockReset();
    getDeps.mockReset().mockResolvedValue(deps);
  });

  it("mostra apenas as informações no carregamento e expõe o botão de editar", () => {
    renderSettings();
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Orquestra Jovem")).toBeTruthy();
    expect(screen.getByRole("button", { name: /editar/i })).toBeTruthy();
    // Campos de edição não devem estar visíveis no modo visualização
    expect(screen.queryByRole("textbox", { name: /seu nome/i })).toBeNull();
    // O seletor de idioma não aparece na visualização
    expect(screen.queryByRole("button", { name: /Português/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /English/i })).toBeNull();
  });

  it("mostra apenas o idioma configurado na visualização", () => {
    renderSettings();
    // Deve mostrar o idioma atual (Português por padrão / detectado do sistema)
    expect(screen.getByText(/Português|English/)).toBeTruthy();
  });

  it("exibe o seletor de idioma apenas no modo edição", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    // Agora os botões de idioma aparecem no formulário de edição
    expect(screen.getByRole("button", { name: /Português/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /English/i })).toBeTruthy();
  });

  it("preenche os campos após entrar no modo edição e valida campos obrigatórios", async () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    expect((screen.getByRole("textbox", { name: /seu nome/i }) as HTMLInputElement).value).toBe("Ana");
    fireEvent.change(screen.getByRole("textbox", { name: /seu nome/i }), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));
    expect(screen.getByRole("alert").textContent).toContain("Informe seu nome.");
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("salva campos editáveis e atualiza o profile store imediatamente", async () => {
    const updated = { ...profile, displayName: "Ana Maria", ensembleName: "Camerata" };
    saveProfile.mockResolvedValue(updated);
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /seu nome/i }), { target: { value: "Ana Maria" } });
    fireEvent.change(screen.getByRole("textbox", { name: /conjunto, orquestra ou escola/i }), { target: { value: "Camerata" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(saveProfile).toHaveBeenCalledOnce());
    expect(saveProfile).toHaveBeenCalledWith(deps, {
      displayName: "Ana Maria",
      instruments: ["violin", "other"],
      primaryInstrument: "violin",
      otherInstrumentLabel: "Bandolim",
      experienceLevel: "intermediate",
      musicalRoles: ["orchestra", "student"],
      ensembleName: "Camerata",
    });
    await waitFor(() => expect(useProfileStore.getState().profile).toEqual(updated));
  });
});
