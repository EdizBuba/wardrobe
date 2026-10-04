"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useApp } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useResource } from "@/components/shared/use-resource";
import { ResourceState, Empty } from "@/components/shared/states";
import { dateInTimezone } from "../domain/calendar";
import type { Plan } from "@/modules/shared/presentation/types";
import { PlanCard } from "./plan-card";
import { PlanForm } from "./plan-form";
export function Planner() {
  const { locationId, me } = useApp();
  const today = dateInTimezone(me!.preference.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [edit, setEdit] = useState<Plan | "new" | null>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstWeekday =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const resource = useResource<{ plans: Plan[] }>(
    `plans?from=${month}-01&to=${month}-${last}${locationId ? "&locationId=" + locationId : ""}`,
  );
  const plans =
    resource.data?.plans.filter((p) => p.plannedDate.slice(0, 10) === day) ??
    [];
  function shift(delta: number) {
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
      .toISOString()
      .slice(0, 10);
    setMonth(date.slice(0, 7));
    setDay(date);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">UN PEU D’AVANCE, L’ESPRIT LIBRE</p>
          <h1>Mon planning</h1>
          <p className="muted">
            Préparez les jours à venir, une tenue à la fois.
          </p>
        </div>
        <Button onClick={() => setEdit("new")}>
          <Plus size={17} />
          Prévoir une tenue
        </Button>
      </div>
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <div className="calendar-heading">
            <Button
              variant="ghost"
              aria-label="Mois précédent"
              onClick={() => shift(-1)}
            >
              <ChevronLeft />
            </Button>
            <h2>
              {new Intl.DateTimeFormat("fr-FR", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(new Date(month + "-01"))}
            </h2>
            <Button
              variant="ghost"
              aria-label="Mois suivant"
              onClick={() => shift(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <div className="calendar-grid">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <span className="weekday" key={d}>
                {d}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={"blank" + i} />
            ))}
            {Array.from({ length: last }, (_, i) => {
              const date = month + "-" + String(i + 1).padStart(2, "0");
              const count =
                resource.data?.plans.filter(
                  (p) => p.plannedDate.slice(0, 10) === date,
                ).length ?? 0;
              return (
                <button
                  key={date}
                  className={`calendar-day ${day === date ? "selected" : ""} ${date === today ? "today" : ""}`}
                  aria-pressed={day === date}
                  aria-label={date + (count ? ", " + count + " tenue(s)" : "")}
                  onClick={() => setDay(date)}
                >
                  <span>{i + 1}</span>
                  {count > 0 && (
                    <span className="plan-dot" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setMonth(today.slice(0, 7));
              setDay(today);
            }}
          >
            Revenir à aujourd’hui
          </Button>
        </section>
        <section className="day-plans">
          <div className="section-heading">
            <h2>
              {new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(day))}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEdit("new")}
              aria-label="Ajouter une tenue ce jour"
            >
              <Plus size={17} />
            </Button>
          </div>
          <ResourceState {...resource} retry={resource.reload} />
          {resource.data &&
            (plans.length ? (
              plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onChange={resource.reload}
                  onEdit={() => setEdit(plan)}
                />
              ))
            ) : (
              <Empty
                title="Une journée à imaginer."
                description="Aucune tenue prévue pour cette date."
              >
                <Button onClick={() => setEdit("new")}>
                  Choisir une tenue
                </Button>
              </Empty>
            ))}
        </section>
      </div>
      {edit && (
        <PlanForm
          plan={edit === "new" ? undefined : edit}
          defaultDate={day}
          onSaved={resource.reload}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
