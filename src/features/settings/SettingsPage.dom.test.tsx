// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "../../domain/profile";
import type { Deps } from "../../application/deps";

const { saveProfile, getDeps } = vi.hoisted(() => ({ saveProfile: vi.fn(), getDeps: vi.fn() }));
vi.mock("../../application/profile", () => ({ saveProfile }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { SettingsPage } from "./SettingsPage";
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
const deps = {} as Deps;

describe("SettingsPage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    useProfileStore.getState().setProfile(profile);
    saveProfile.mockReset();
    getDeps.mockReset().mockResolvedValue(deps);
  });

  it("pre-fills the profile and validates required fields", () => {
    render(<SettingsPage />);
    expect((screen.getByRole("textbox", { name: "Seu nome" }) as HTMLInputElement).value).toBe("Ana");
    expect(screen.getByText("Orquestra Jovem")).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Qual instrumento?" }) as HTMLInputElement).value).toBe("Bandolim");
    fireEvent.change(screen.getByRole("textbox", { name: "Seu nome" }), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));
    expect(screen.getByRole("alert").textContent).toContain("Informe seu nome.");
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("saves editable fields and updates the profile store immediately", async () => {
    const updated = { ...profile, displayName: "Ana Maria", ensembleName: "Camerata" };
    saveProfile.mockResolvedValue(updated);
    render(<SettingsPage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Seu nome" }), { target: { value: "Ana Maria" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Conjunto, orquestra ou escola" }), { target: { value: "Camerata" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar perfil" }));

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
