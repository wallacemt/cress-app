// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../../application/deps";
import type { RepertoireItem } from "../../domain/repertoire";

const { listPieces, getDeps } = vi.hoisted(() => ({
  listPieces: vi.fn(),
  getDeps: vi.fn(),
}));
vi.mock("../../application/repertoire", () => ({ listPieces }));
vi.mock("../../app/container", () => ({ container: { getDeps } }));
import { RepertoirePage } from "./RepertoirePage";

const deps = {} as Deps;
const pieces: RepertoireItem[] = [
  {
    id: "piece-1",
    title: "A Amizade é Tudo",
    composer: "Compositor Exemplo",
    instrument: "violin",
  },
  { id: "piece-2", title: "Noite Serena", composer: "Outra Pessoa" },
];

describe("RepertoirePage", () => {
  afterEach(cleanup);
  beforeEach(() => {
    getDeps.mockReset().mockResolvedValue(deps);
    listPieces.mockReset().mockResolvedValue(pieces);
  });

  it("shows both entry actions when the repertoire is empty", async () => {
    listPieces.mockResolvedValue([]);
    render(<RepertoirePage />);

    expect(
      await screen.findByRole("heading", { name: /Seu repertório/ }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adicionar obra" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Importar pasta de partituras" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("filters titles without regard to accents or case", async () => {
    render(<RepertoirePage />);
    const search = await screen.findByRole("searchbox", {
      name: "Buscar por título ou compositor",
    });

    fireEvent.change(search, { target: { value: "amizade" } });

    await waitFor(() =>
      expect(screen.getByRole("option").textContent).toContain(
        "A Amizade é Tudo",
      ),
    );
    expect(document.querySelector("mark")?.textContent).toBe("Amizade");
    expect(screen.queryByText("Noite Serena")).toBeNull();
  });
});
