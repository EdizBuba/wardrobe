"use client";
import { useState } from "react";
import { Dialog } from "@/components/shared/dialog";
import { Button } from "@/components/ui/button";
import { api, jsonBody } from "@/lib/api-client";
import type { Location } from "@/modules/shared/presentation/types";
import { locationTypes } from "@/config/labels";
export function LocationForm({
  location,
  onClose,
  onSaved,
}: {
  location?: Location;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setPending(true);
    try {
      await api("locations" + (location ? "/" + location.id : ""), {
        method: location ? "PATCH" : "POST",
        body: jsonBody({
          name: data.get("name"),
          type: data.get("type"),
          isDefault: data.get("isDefault") === "on",
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function archive() {
    setPending(true);
    try {
      await api("locations/" + location!.id, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      title={location ? "Modifier l’emplacement" : "Ajouter un emplacement"}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={save}>
        <label>
          Nom
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={location?.name}
            placeholder="Appartement, chez mes parents…"
          />
        </label>
        <label>
          Type
          <select
            aria-label="Type"
            name="type"
            defaultValue={location?.type ?? "HOME"}
          >
            {Object.entries(locationTypes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={location?.isDefault}
          />
          Emplacement par défaut
        </label>
        <p className="muted small">
          Archiver un lieu conserve les pièces et l’historique associés.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {location && (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={archive}
            >
              Archiver
            </Button>
          )}
          <Button disabled={pending}>Enregistrer</Button>
        </div>
      </form>
    </Dialog>
  );
}
