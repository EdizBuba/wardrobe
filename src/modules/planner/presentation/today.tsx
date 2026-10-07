"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { useApp } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useResource } from "@/components/shared/use-resource";
import { ResourceState, Empty } from "@/components/shared/states";
import { Composition, AvailabilityBadge } from "@/components/shared/visuals";
import { dateInTimezone } from "../domain/calendar";
import type { Plan, Outfit } from "@/modules/shared/presentation/types";
import { PlanCard } from "./plan-card";
import { PlanForm } from "./plan-form";
export function Today() {
  const { me, locationId, locations } = useApp();
  const today = dateInTimezone(me!.preference.timezone);
  const end = new Date(Date.parse(today) + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const plans = useResource<{ plans: Plan[] }>(
    `plans?from=${today}&to=${end}${locationId ? "&locationId=" + locationId : ""}`,
  );
  const outfits = useResource<{ outfits: Outfit[] }>(
    "outfits" + (locationId ? "?locationId=" + locationId : ""),
  );
  const [edit, setEdit] = useState<Plan | "new" | null>(null);
  const todayPlans =
    plans.data?.plans.filter((p) => p.plannedDate.slice(0, 10) === today) ?? [];
  const upcoming =
    plans.data?.plans
      .filter((p) => p.plannedDate.slice(0, 10) > today)
      .slice(0, 4) ?? [];
  const inspiration = [...(outfits.data?.outfits ?? [])]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite))
    .slice(0, 3);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })
              .format(new Date(today))
              .toUpperCase()}
          </p>
          <h1>
            Bonjour {me!.user.name.split(" ")[0]}
            <span className="greeting-dot">.</span>
          </h1>
          <p className="muted">
            Une belle journée commence par une tenue qui vous ressemble.
          </p>
        </div>
        <Button variant="outline" onClick={() => setEdit("new")}>
          <Plus size={18} />
          Prévoir une tenue
        </Button>
      </div>
      <div className="today-columns">
        <section>
          <div className="section-heading">
            <h2>Aujourd’hui, je porte</h2>
            <span className="muted small">
              <MapPin size={14} />
              {locations.find((l) => l.id === locationId)?.name ??
                "Choisir un emplacement"}
            </span>
          </div>
          <ResourceState {...plans} retry={plans.reload} />
          {plans.data &&
            (todayPlans.length ? (
              todayPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  prominent
                  onChange={plans.reload}
                  onEdit={() => setEdit(plan)}
                />
              ))
            ) : (
              <Empty
                title="Et si on préparait votre journée ?"
                description="Aucune tenue prévue aujourd’hui."
              >
                <Button onClick={() => setEdit("new")}>Choisir ma tenue</Button>
                <Link href="/outfits" className="text-link">
                  Parcourir mes tenues →
                </Link>
              </Empty>
            ))}
          <div className="section-heading section-space">
            <div>
              <p className="eyebrow">ENVIE D’AUTRE CHOSE ?</p>
              <h2>À retrouver, à réinventer</h2>
            </div>
            <Link href="/outfits" className="text-link">
              Toutes mes tenues <ArrowUpRight size={16} />
            </Link>
          </div>
          <ResourceState {...outfits} retry={outfits.reload} />
          <div className="inspiration-grid">
            {inspiration.map((outfit) => (
              <Link
                key={outfit.id}
                href={"/outfits/" + outfit.id}
                className="outfit-card"
              >
                {outfit.variants[0] && (
                  <Composition variant={outfit.variants[0]} />
                )}
                <div className="card-body">
                  <h3>{outfit.name}</h3>
                  {outfit.variants[0] && (
                    <AvailabilityBadge
                      availability={outfit.variants[0].availability}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
          {outfits.data && !inspiration.length && (
            <p className="muted">
              Vos premières tenues apparaîtront ici.{" "}
              <Link href="/outfits" className="text-link">
                Composer une tenue
              </Link>
            </p>
          )}
        </section>
        <aside>
          <div className="panel upcoming-panel">
            <div className="section-heading">
              <h2>Les prochains jours</h2>
              <CalendarDays size={19} />
            </div>
            {upcoming.map((plan) => (
              <Link className="upcoming-row" key={plan.id} href="/planner">
                <div className="date-tile">
                  <strong>{plan.plannedDate.slice(8, 10)}</strong>
                  <span>
                    {new Intl.DateTimeFormat("fr-FR", {
                      month: "short",
                      timeZone: "UTC",
                    }).format(new Date(plan.plannedDate))}
                  </span>
                </div>
                <div>
                  <h3>{plan.variant.outfit.name}</h3>
                  <p className="muted small">{plan.variant.name}</p>
                  <AvailabilityBadge availability={plan.availability} />
                </div>
              </Link>
            ))}
            {!upcoming.length && (
              <p className="muted">
                Un peu de place pour vos prochaines idées.
              </p>
            )}
            <Button asChild variant="outline">
              <Link href="/planner">
                Ouvrir le planning <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
          <div className="quick-add panel">
            <p className="eyebrow">FAITES PLACE À VOS IDÉES</p>
            <h2>
              Une nouvelle pièce.
              <br />
              Une nouvelle possibilité.
            </h2>
            <p className="muted small">Votre garde-robe évolue avec vous.</p>
            <Button asChild variant="outline">
              <Link href="/wardrobe">
                <Plus size={17} />
                Enrichir ma garde-robe
              </Link>
            </Button>
          </div>
        </aside>
      </div>
      {edit && (
        <PlanForm
          plan={edit === "new" ? undefined : edit}
          defaultDate={today}
          onSaved={plans.reload}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
