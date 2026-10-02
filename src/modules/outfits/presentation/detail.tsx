"use client";
import Link from "next/link";
import { useState } from "react";
import { Heart,} from "lucide-react";
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
} from "@/modules/shared/presentation/types";
import { api, jsonBody } from "@/lib/api-client";
export function OutfitDetail({ id }: { id: string }) {
  const { locationId, locations, me } = useApp();
  const resource = useResource<Outfit>(
    `outfits/${id}${locationId ? "?locationId=" + locationId : ""}`,
  );
  const [activeId, setActiveId] = useState("");
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
        </aside>
      </div>
      
      
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
