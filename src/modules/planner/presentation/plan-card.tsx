"use client";
import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Composition,
  AvailabilityBadge,
  AvailabilityWarnings,
} from "@/components/shared/visuals";
import { useApp } from "@/components/layout/app-shell";
import type { Plan } from "@/modules/shared/presentation/types";
import { api,} from "@/lib/api-client";
import { slots } from "@/config/labels";
export function PlanCard({
  plan,
  onChange,
  onEdit,
  prominent = false,
}: {
  plan: Plan;
  onChange: () => void;
  onEdit: () => void;
  prominent?: boolean;
}) {
  const { locations, me } = useApp();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError("");
    try {
      await action();
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <article className={`plan-card ${prominent ? "plan-prominent" : ""}`}>
      <Link href={"/outfits/" + plan.variant.outfit.id} className="plan-image">
        <Composition variant={plan.variant} eager={prominent} />
      </Link>
      <div className="plan-body">
        <p className="eyebrow">{slots[plan.slot]}</p>
        <Link href={"/outfits/" + plan.variant.outfit.id}>
          <h2>{plan.variant.outfit.name}</h2>
        </Link>
        <p className="muted small">
          {plan.variant.name} · {plan.variant.items.length} pièces
        </p>
        <AvailabilityBadge availability={plan.availability} />
        <AvailabilityWarnings
          availability={plan.availability}
          locations={locations}
        />
        {plan.conflicts.length > 0 && (
          <p className="notice small">
            Cette tenue partage des pièces avec une autre tenue prévue au même
            moment.
          </p>
        )}
        {plan.note && <p>{plan.note}</p>}
        <div className="inline-actions">
          
          {!plan.wearLog && (
            <Button variant="outline" disabled={pending} onClick={onEdit}>
              <Pencil size={16} />
              <span>{prominent ? "Changer" : "Modifier"}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            aria-label="Retirer du planning"
            disabled={pending}
            onClick={() =>
              run(() => api("plans/" + plan.id, { method: "DELETE" }))
            }
          >
            <Trash2 size={16} />
          </Button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
