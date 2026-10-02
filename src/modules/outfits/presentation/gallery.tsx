"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Heart } from "lucide-react";
import { useApp } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useResource } from "@/components/shared/use-resource";
import { ResourceState, Empty } from "@/components/shared/states";
import { Composition, AvailabilityBadge } from "@/components/shared/visuals";
import type { Outfit } from "@/modules/shared/presentation/types";
import { OutfitBuilder } from "./builder";
export function OutfitGallery() {
  const { locationId } = useApp();
  const router = useRouter();
  const [builder, setBuilder] = useState(false);
  const [available, setAvailable] = useState(false);
  const [favorites, setFavorites] = useState(false);
  const [season, setSeason] = useState("");
  const [occasion, setOccasion] = useState("");
  const [page, setPage] = useState(1);
  const resource = useResource<{
    outfits: Outfit[];
    total: number;
    pageSize: number;
  }>(
    `outfits?page=${page}${locationId ? "&locationId=" + locationId : ""}&${new URLSearchParams({ ...(favorites ? { favorite: "1" } : {}), ...(available ? { available: "1" } : {}), ...(season ? { season } : {}), ...(occasion ? { occasion } : {}) })}`,
  );
  const outfits = resource.data?.outfits ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">VOTRE STYLE, EN QUELQUES PIÈCES</p>
          <h1>
            Mes tenues
            <span className="heading-count">{resource.data?.total ?? "—"}</span>
          </h1>
          <p className="muted">Les associations qui vous ressemblent.</p>
        </div>
        <Button onClick={() => setBuilder(true)}>
          <Plus size={18} />
          Composer une tenue
        </Button>
      </div>
      <div className="filter-bar">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => {
              setAvailable(e.target.checked);
              setPage(1);
            }}
          />
          Disponibles ici
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={favorites}
            onChange={(e) => {
              setFavorites(e.target.checked);
              setPage(1);
            }}
          />
          Favorites
        </label>
        <label>
          <span className="sr-only">Saison</span>
          <input
            placeholder="Saison…"
            value={season}
            onChange={(e) => {
              setSeason(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <span className="sr-only">Occasion</span>
          <input
            placeholder="Occasion…"
            value={occasion}
            onChange={(e) => {
              setOccasion(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data &&
        (outfits.length ? (
          <div className="outfit-grid">
            {outfits.map((outfit) => {
              const variant = outfit.variants[0];
              return (
                <Link
                  className="outfit-card"
                  key={outfit.id}
                  href={"/outfits/" + outfit.id}
                >
                  {variant && <Composition variant={variant} />}
                  <div className="card-body">
                    <div className="card-title">
                      <h3>{outfit.name}</h3>
                      {outfit.favorite && (
                        <Heart size={17} aria-label="Favorite" />
                      )}
                    </div>
                    <p className="muted small">
                      {outfit.variants.length} variante
                      {outfit.variants.length > 1 ? "s" : ""} · {variant?.name}
                    </p>
                    {variant && (
                      <AvailabilityBadge availability={variant.availability} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Vos idées de tenues, réunies ici."
            description="Créez votre première tenue avec les vêtements de votre garde-robe."
          >
            <Button onClick={() => setBuilder(true)}>Composer une tenue</Button>
          </Empty>
        ))}
      {resource.data && resource.data.total > resource.data.pageSize && (
        <div className="pagination">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Précédent
          </Button>
          <span>Page {page}</span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page * resource.data.pageSize >= resource.data.total}
          >
            Suivant
          </Button>
        </div>
      )}
      {builder && (
        <OutfitBuilder
          onClose={() => setBuilder(false)}
          onSaved={(id) => {
            resource.reload();
            if (id) router.push("/outfits/" + id);
          }}
        />
      )}
    </>
  );
}
