"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/shared/dialog";
import { ItemImage } from "@/components/shared/visuals";
import { useApp } from "@/components/layout/app-shell";
import { api, jsonBody } from "@/lib/api-client";
import type { Item } from "@/modules/shared/presentation/types";
import { categories, statuses, conditions } from "@/config/labels";
import { useResource } from "@/components/shared/use-resource";
type Fields = {
  name: string;
  category: string;
  locationId: string;
  status: string;
  condition: string;
  brand: string;
  size: string;
  primaryColor: string;
  sourceUrl: string;
  notes: string;
  favorite: boolean;
};
export function ItemForm({
  item,
  onClose,
  onSaved,
}: {
  item?: Item;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { locations, locationId } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    defaultValues: {
      name: item?.name ?? "",
      category: item?.category ?? "TOP",
      locationId: item?.locationId ?? locationId,
      status: item?.status ?? "AVAILABLE",
      condition: item?.condition ?? "GOOD",
      brand: item?.brand ?? "",
      size: item?.size ?? "",
      primaryColor: item?.primaryColor ?? "",
      sourceUrl: item?.sourceUrl ?? "",
      notes: item?.notes ?? "",
      favorite: item?.favorite ?? false,
    },
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [savedId, setSavedId] = useState(item?.id);
  const detail = useResource<
    Item & {
      wearItems: {
        wearLog: { id: string; wornDate: string; outfitName: string };
      }[];
    }
  >(item ? "items/" + item.id : null);
  const displayedItem = detail.data ?? item;
  async function save(fields: Fields) {
    setPending(true);
    setError("");
    try {
      const data = { ...fields, sourceUrl: fields.sourceUrl || null };
      const saved = await api<{ id: string }>(
        "items" + (savedId ? "/" + savedId : ""),
        {
          method: savedId ? "PATCH" : "POST",
          body: jsonBody({
            ...item,
            ...data,
            purchaseDate: item?.purchaseDate?.slice(0, 10) ?? null,
          }),
        },
      );
      setSavedId(saved.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(
        (e as Error).message,
      );
    } finally {
      setPending(false);
    }
  }
  async function archive() {
    if (!item) return;
    setPending(true);
    setError("");
    try {
      await api("items/" + item.id, { method: "DELETE" });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog title={item ? item.name : "Ajouter une pièce"} onClose={onClose}>
      <form onSubmit={handleSubmit(save)} className="form-stack">
        {displayedItem && (
          <div className="detail-image">
            <ItemImage item={displayedItem} full />
          </div>
        )}
        
        
        <label>
          Nom de la pièce
          <input
            {...register("name", {
              required: "Un nom est nécessaire.",
              maxLength: 120,
            })}
            required
            maxLength={120}
            placeholder="Jean noir, chemise blanche…"
          />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </label>
        <div className="form-grid">
          <label>
            Catégorie
            <select aria-label="Catégorie" {...register("category")}>
              {Object.entries(categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Emplacement
            <select
              aria-label="Emplacement"
              {...register("locationId", { required: true })}
              required
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Disponibilité
            <select aria-label="Disponibilité" {...register("status")}>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            État
            <select aria-label="État" {...register("condition")}>
              {Object.entries(conditions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details>
          <summary>Quelques détails supplémentaires</summary>
          <div className="form-grid">
            <label>
              Marque
              <input {...register("brand")} maxLength={80} />
            </label>
            <label>
              Taille
              <input {...register("size")} maxLength={40} />
            </label>
            <label>
              Couleur principale
              <input {...register("primaryColor")} maxLength={40} />
            </label>
          </div>
          <label>
            Lien du produit
            <input
              {...register("sourceUrl")}
              type="url"
              placeholder="https://…"
            />
          </label>
          <label>
            Notes
            <textarea {...register("notes")} maxLength={4000} />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" {...register("favorite")} />
            Pièce favorite
          </label>
        </details>
        {detail.data && detail.data.wearItems.length > 0 && (
          <section>
            <h3>Dernières fois portée</h3>
            {detail.data.wearItems.map(({ wearLog }) => (
              <p className="small muted" key={wearLog.id}>
                {wearLog.wornDate.slice(0, 10)} · {wearLog.outfitName}
              </p>
            ))}
          </section>
        )}
        {item && (
          <p className="muted small">
            L’archivage conserve la pièce dans les tenues et l’historique.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {item && (
            <Button
              type="button"
              variant="destructive"
              onClick={archive}
              disabled={pending}
            >
              Archiver
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
