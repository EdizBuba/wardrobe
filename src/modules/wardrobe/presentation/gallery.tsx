"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useApp } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ItemImage, ItemCaption } from "@/components/shared/visuals";
import { ResourceState, Empty } from "@/components/shared/states";
import { useResource } from "@/components/shared/use-resource";
import { categories, statuses } from "@/config/labels";
import type { Item } from "@/modules/shared/presentation/types";
import { ItemForm } from "./item-form";
export function WardrobeGallery() {
  const { locationId, locations } = useApp();
  const [allLocations, setAllLocations] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const resource = useResource<{
    items: Item[];
    total: number;
    pageSize: number;
  }>(
    `items?page=${page}${!allLocations && locationId ? "&locationId=" + locationId : ""}&${new URLSearchParams({ ...(search ? { search } : {}), ...(category ? { category } : {}), ...(status ? { status } : {}) })}`,
  );
  const items = resource.data?.items ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">VOS PIÈCES, À PORTÉE DE MAIN</p>
          <h1>
            Ma garde-robe
            <span className="heading-count">{resource.data?.total ?? "—"}</span>
          </h1>
          <p className="muted">
            Tout ce que vous aimez porter, au bon endroit.
          </p>
        </div>
        <Button onClick={() => setEditing("new")} disabled={!locations.length}>
          <Plus size={18} />
          Ajouter une pièce
        </Button>
      </div>
      {!locations.length && (
        <div className="notice">
          Commencez par{" "}
          <Link href="/settings">créer votre premier emplacement</Link>.
        </div>
      )}
      <div className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Rechercher une pièce</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher une pièce…"
          />
        </label>
        <label>
          <span className="sr-only">Catégorie</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Disponibilité</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={allLocations}
            onChange={(e) => {
              setAllLocations(e.target.checked);
              setPage(1);
            }}
          />
          Tous les lieux
        </label>
      </div>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data &&
        (items.length ? (
          <div className="item-grid">
            {items.map((item) => (
              <button
                className="item-card"
                key={item.id}
                onClick={() => setEditing(item)}
              >
                <ItemImage item={item} />
                <div className="card-body">
                  <ItemCaption item={item} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title={
              search || category || status
                ? "Aucune pièce ne correspond."
                : "Votre garde-robe prend vie ici."
            }
            description="Ajoutez votre premier vêtement pour commencer."
          >
            <Button
              onClick={() => setEditing("new")}
              disabled={!locations.length}
            >
              Ajouter une pièce
            </Button>
          </Empty>
        ))}
      {resource.data && resource.data.total > resource.data.pageSize && (
        <div className="pagination">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Précédent
          </Button>
          <span>Page {page}</span>
          <Button
            variant="outline"
            disabled={page * resource.data.pageSize >= resource.data.total}
            onClick={() => setPage(page + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
      {editing && (
        <ItemForm
          item={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={resource.reload}
        />
      )}
    </>
  );
}
