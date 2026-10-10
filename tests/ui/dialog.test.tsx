// @vitest-environment jsdom
import { beforeAll, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Dialog } from "@/components/shared/dialog";
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
it("exposes a named modal and accessible close control", () => {
  let closed = false;
  render(
    <Dialog
      title="Ajouter une pièce"
      onClose={() => {
        closed = true;
      }}
    >
      <label>
        Nom
        <input />
      </label>
    </Dialog>,
  );
  expect(
    screen.getByRole("dialog", { name: "Ajouter une pièce" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
  expect(closed).toBe(true);
});
