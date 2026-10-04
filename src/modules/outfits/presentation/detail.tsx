"use client";
import Link from "next/link";
import { useState } from "react";
import { Heart, Plus, Copy, Pencil, CalendarDays, Check } from "lucide-react";
import { useApp } from "@/components/layout/app-shell";
import { useResource } from "@/components/shared/use-resource";
import { ResourceState } from "@/components/shared/states";
import {
  ItemImage,
  AvailabilityBadge,
  AvailabilityWarnings,
} from "@/components/shared/visuals";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/shared/dialog";
import type {
  Outfit,
  Variant,
  WearLog,
} from "@/modules/shared/presentation/types";
import { OutfitBuilder } from "./builder";
import { PlanForm } from "@/modules/planner/presentation/plan-form";
import { api, jsonBody } from "@/lib/api-client";
import { dateInTimezone } from "@/modules/planner/domain/calendar";
export function OutfitDetail({ id }: { id: string }) {
  const { locationId, locations, me } = useApp();
  const resource = useResource<Outfit>(
    `outfits/${id}${locationId ? "?locationId=" + locationId : ""}`,
  );
  const history = useResource<WearLog[]>("history");
  const [activeId, setActiveId] = useState("");
  const [builder, setBuilder] = useState<Variant | "new" | null>(null);
  const [planning, setPlanning] = useState(false);
  const [editName, setEditName] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const outfit = resource.data;
  const variant =
    outfit?.variants.find((v) => v.id === activeId) ?? outfit?.variants[0];
  async function run(action: () => Promise<unknown>, success = "") {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await action();
      resource.reload();
      history.reload();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  if (!outfit || !variant)
    return <ResourceState {...resource} retry={resource.reload} />;
  return (
    <>
      <Link href="/outfits" className="back-link">
        ← Toutes mes tenues
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LES PIÈCES QUI VONT ENSEMBLE</p>
          <h1>{outfit.name}</h1>
          <p className="muted">{outfit.description}</p>
        </div>
        <div className="inline-actions">
          <Button
            variant="outline"
            aria-label={
              outfit.favorite
                ? "Retirer des favorites"
                : "Ajouter aux favorites"
            }
            disabled={pending}
            onClick={() =>
              run(() =>
                api("outfits/" + id, {
                  method: "PATCH",
                  body: jsonBody({
                    name: outfit.name,
                    description: outfit.description,
                    favorite: !outfit.favorite,
                  }),
                }),
              )
            }
          >
            <Heart size={18} fill={outfit.favorite ? "currentColor" : "none"} />
          </Button>
          <Button variant="outline" onClick={() => setEditName(true)}>
            Modifier
          </Button>
          <Button
            onClick={() => setPlanning(true)}
            disabled={!!outfit.archivedAt}
          >
            <CalendarDays size={17} />
            Planifier
          </Button>
        </div>
      </div>
      {outfit.archivedAt && <p className="notice">Cette tenue est archivée.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      <div className="variant-tabs" role="group" aria-label="Variantes">
        {outfit.variants.map((v) => (
          <Button
            key={v.id}
            variant={v.id === variant.id ? "default" : "outline"}
            onClick={() => setActiveId(v.id)}
          >
            {v.name}
            {v.isDefault ? " · principale" : ""}
          </Button>
        ))}
        <Button
          variant="ghost"
          onClick={() => setBuilder("new")}
          disabled={!!outfit.archivedAt}
        >
          <Plus size={16} />
          Variante
        </Button>
      </div>
      <div className="detail-columns">
        <section>
          <div className="outfit-composition">
            {variant.items.map(({ item }) => (
              <div key={item.id}>
                <ItemImage item={item} />
                <p>{item.name}</p>
              </div>
            ))}
          </div>
          <div className="inline-actions">
            <Button
              variant="outline"
              onClick={() => setBuilder(variant)}
              disabled={!!outfit.archivedAt}
            >
              <Pencil size={16} />
              Modifier les pièces
            </Button>
            <Button
              variant="outline"
              disabled={pending || !!outfit.archivedAt}
              onClick={() =>
                run(() =>
                  api(`outfits/${id}/variants/${variant.id}/clone`, {
                    method: "POST",
                  }),
                )
              }
            >
              <Copy size={16} />
              Dupliquer
            </Button>
          </div>
        </section>
        <aside className="panel">
          <p className="eyebrow">ICI ET MAINTENANT</p>
          <h2>
            {locations.find((l) => l.id === locationId)?.name ??
              "Aucun lieu sélectionné"}
          </h2>
          <AvailabilityBadge availability={variant.availability} />
          <AvailabilityWarnings
            availability={variant.availability}
            locations={locations}
          />
          <hr />
          <h3>Vous l’avez portée ?</h3>
          <p className="muted small">
            Ajoutez cette tenue à votre historique d’aujourd’hui.
          </p>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  api("history", {
                    method: "POST",
                    body: jsonBody({
                      outfitVariantId: variant.id,
                      wornDate: dateInTimezone(me!.preference.timezone),
                    }),
                  }),
                "Tenue ajoutée à l’historique.",
              )
            }
          >
            <Check size={17} />
            Marquer comme portée
          </Button>
          <hr />
          <h3>Dernières fois</h3>
          {history.data
            ?.filter((l) =>
              outfit.variants.some((v) => v.id === l.outfitVariantId),
            )
            .slice(0, 5)
            .map((l) => (
              <p className="small" key={l.id}>
                {l.wornDate.slice(0, 10)} · {l.variantName}
              </p>
            ))}
          <Link href="/history" className="text-link">
            Voir l’historique →
          </Link>
        </aside>
      </div>
      {builder && (
        <OutfitBuilder
          outfit={outfit}
          variant={builder === "new" ? undefined : builder}
          onSaved={resource.reload}
          onClose={() => setBuilder(null)}
        />
      )}
      {planning && (
        <PlanForm
          defaultVariantId={variant.id}
          onSaved={() => setMessage("Tenue planifiée.")}
          onClose={() => setPlanning(false)}
        />
      )}
      {editName && (
        <Dialog title="Modifier la tenue" onClose={() => setEditName(false)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              run(() =>
                api("outfits/" + id, {
                  method: "PATCH",
                  body: jsonBody({
                    name: data.get("name"),
                    description: data.get("description"),
                    favorite: outfit.favorite,
                  }),
                }),
              ).then(() => setEditName(false));
            }}
          >
            <label>
              Nom
              <input
                name="name"
                defaultValue={outfit.name}
                required
                maxLength={120}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={outfit.description ?? ""}
                maxLength={4000}
              />
            </label>
            <div className="form-actions">
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  run(() => api("outfits/" + id, { method: "DELETE" })).then(
                    () => setEditName(false),
                  )
                }
              >
                Archiver
              </Button>
              <Button disabled={pending}>Enregistrer</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
