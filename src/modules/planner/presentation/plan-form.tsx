"use client";
import { useState } from "react";
import { Dialog } from "@/components/shared/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/layout/app-shell";
import { useResource } from "@/components/shared/use-resource";
import {
  AvailabilityBadge,
  AvailabilityWarnings,
} from "@/components/shared/visuals";
import { ResourceState } from "@/components/shared/states";
import { api, jsonBody } from "@/lib/api-client";
import type { Outfit, Plan } from "@/modules/shared/presentation/types";
import { dateInTimezone } from "@/modules/planner/domain/calendar";
import { slots } from "@/config/labels";
export function PlanForm({
  plan,
  defaultVariantId,
  defaultDate,
  onSaved,
  onClose,
}: {
  plan?: Plan;
  defaultVariantId?: string;
  defaultDate?: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { locationId, locations, me } = useApp();
  const [page, setPage] = useState(1);
  const resource = useResource<{
    outfits: Outfit[];
    total: number;
    pageSize: number;
  }>(`outfits?page=${page}${locationId ? "&locationId=" + locationId : ""}`);
  const [variantId, setVariantId] = useState(
    plan?.outfitVariantId ?? defaultVariantId ?? "",
  );
  const [date, setDate] = useState(
    plan?.plannedDate.slice(0, 10) ??
      defaultDate ??
      dateInTimezone(me?.preference.timezone ?? "Europe/Paris"),
  );
  const [slot, setSlot] = useState(plan?.slot ?? "ALL_DAY");
  const [note, setNote] = useState(plan?.note ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const variants =
    resource.data?.outfits.flatMap((o) =>
      o.variants.map((v) => ({ ...v, outfitName: o.name })),
    ) ?? [];
  const selected = variants.find((v) => v.id === variantId);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("plans" + (plan ? "/" + plan.id : ""), {
        method: plan ? "PATCH" : "POST",
        body: jsonBody({
          outfitVariantId: variantId,
          plannedDate: date,
          slot,
          note,
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
  return (
    <Dialog
      title={plan ? "Modifier le programme" : "Prévoir une tenue"}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={save}>
        <ResourceState {...resource} retry={resource.reload} />
        <label>
          Tenue et variante
          <select
            aria-label="Tenue et variante"
            required
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            <option value="">Choisir une tenue</option>
            {variantId && !variants.some((v) => v.id === variantId) && (
              <option value={variantId}>
                {plan
                  ? plan.variant.outfit.name + " · " + plan.variant.name
                  : "Variante sélectionnée"}
              </option>
            )}
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.outfitName} · {v.name}
              </option>
            ))}
          </select>
        </label>
        {resource.data && resource.data.total > resource.data.pageSize && (
          <div className="pagination">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Tenues précédentes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page * resource.data.pageSize >= resource.data.total}
            >
              Tenues suivantes
            </Button>
          </div>
        )}
        <div className="form-grid">
          <label>
            Date
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Moment
            <select
              aria-label="Moment"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              {Object.entries(slots).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </label>
        {selected && (
          <div className="notice">
            <AvailabilityBadge availability={selected.availability} />
            <AvailabilityWarnings
              availability={selected.availability}
              locations={locations}
            />
            <p className="small muted">
              La disponibilité peut changer d’ici cette date.
            </p>
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={pending || !variantId}>
            {pending ? "Enregistrement…" : "Enregistrer le programme"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
