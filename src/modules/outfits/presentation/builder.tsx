"use client";
import { useState } from "react";
import { Search, Check } from "lucide-react";
import { Dialog } from "@/components/shared/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/layout/app-shell";
import { useResource } from "@/components/shared/use-resource";
import { ResourceState } from "@/components/shared/states";
import { ItemImage, ItemCaption } from "@/components/shared/visuals";
import type {
  Item,
  Outfit,
  Variant,
} from "@/modules/shared/presentation/types";
import { categories } from "@/config/labels";
import { api, jsonBody } from "@/lib/api-client";
export function OutfitBuilder({
  outfit,
  variant,
  onClose,
  onSaved,
}: {
  outfit?: Outfit;
  variant?: Variant;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const { locations, locationId } = useApp();
  const [selected, setSelected] = useState<string[]>(
    variant?.items.map((i) => i.item.id) ?? [],
  );
  const [outfitName, setOutfitName] = useState("");
  const [name, setName] = useState(variant?.name ?? "Version principale");
  const [isDefault, setDefault] = useState(variant?.isDefault ?? !outfit);
  const [seasonTags, setSeasonTags] = useState(
    variant?.seasonTags.join(", ") ?? "",
  );
  const [occasionTags, setOccasionTags] = useState(
    variant?.occasionTags.join(", ") ?? "",
  );
  const [location, setLocation] = useState(locationId);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const resource = useResource<{
    items: Item[];
    total: number;
    pageSize: number;
  }>(
    `items?page=${page}${location ? "&locationId=" + location : ""}&${new URLSearchParams({ ...(search ? { search } : {}), ...(category ? { category } : {}) })}`,
  );
  const items = resource.data?.items ?? [];
  const parseTags = (value: string) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = {
        name,
        isDefault,
        itemIds: selected,
        seasonTags: parseTags(seasonTags),
        occasionTags: parseTags(occasionTags),
        styleTags: variant?.styleTags ?? [],
      };
      const result = outfit
        ? await api<{ id: string }>(
            `outfits/${outfit.id}/variants${variant ? "/" + variant.id : ""}`,
            { method: variant ? "PATCH" : "POST", body: jsonBody(data) },
          )
        : await api<{ id: string }>("outfits", {
            method: "POST",
            body: jsonBody({ name: outfitName, variant: data }),
          });
      onSaved(outfit?.id ?? result.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
    );
  }
  return (
    <Dialog
      title={
        !outfit
          ? "Composer une tenue"
          : variant
            ? "Modifier la variante"
            : "Ajouter une variante"
      }
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={save}>
        {!outfit && (
          <label>
            Nom de la tenue
            <input
              required
              maxLength={120}
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              placeholder="Un lundi au soleil…"
            />
          </label>
        )}
        <div className="form-grid">
          <label>
            Nom de la variante
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setDefault(e.target.checked)}
            />
            Variante principale
          </label>
        </div>
        <div className="selection-heading">
          <h3>Choisir les pièces</h3>
          <span className="badge badge-neutral">
            {selected.length} sélectionnée{selected.length > 1 ? "s" : ""}
          </span>
        </div>
        {selected.length > 0 && (
          <div className="selected-pieces">
            {selected.map((id) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggle(id)}
                aria-label={
                  "Retirer " +
                  (items.find((i) => i.id === id)?.name ??
                    variant?.items.find((i) => i.item.id === id)?.item.name ??
                    "la pièce")
                }
              >
                {items.find((i) => i.id === id)?.name ??
                  variant?.items.find((i) => i.item.id === id)?.item.name ??
                  "Pièce sélectionnée"}{" "}
                ×
              </Button>
            ))}
          </div>
        )}
        <div className="filter-bar">
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Rechercher</span>
            <input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filtrer par lieu</span>
            <select
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les lieux</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrer par catégorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ResourceState {...resource} retry={resource.reload} />
        <div className="builder-grid">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`item-card select-card ${selected.includes(item.id) ? "selected" : ""}`}
              aria-pressed={selected.includes(item.id)}
              onClick={() => toggle(item.id)}
            >
              <ItemImage item={item} />
              {selected.includes(item.id) && (
                <span className="selected-check">
                  <Check size={16} />
                </span>
              )}
              <div className="card-body">
                <ItemCaption item={item} />
              </div>
            </button>
          ))}
        </div>
        {resource.data && resource.data.total > resource.data.pageSize && (
          <div className="pagination">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Précédent
            </Button>
            <span>Page {page}</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page * resource.data.pageSize >= resource.data.total}
            >
              Suivant
            </Button>
          </div>
        )}
        <div className="form-grid">
          <label>
            Saisons
            <input
              value={seasonTags}
              onChange={(e) => setSeasonTags(e.target.value)}
              placeholder="Automne, hiver"
            />
            <span className="field-help">Séparées par des virgules</span>
          </label>
          <label>
            Occasions
            <input
              value={occasionTags}
              onChange={(e) => setOccasionTags(e.target.value)}
              placeholder="Cours, week-end"
            />
          </label>
        </div>
        <p className="muted small">
          Vous pouvez choisir une pièce indisponible ; la tenue affichera un
          avertissement.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={pending || !selected.length}>
            {pending ? "Enregistrement…" : "Enregistrer la tenue"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
