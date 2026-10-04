"use client";
import { useState } from "react";
import { useResource } from "@/components/shared/use-resource";
import { ResourceState, Empty } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { WearLog } from "@/modules/shared/presentation/types";
export function History() {
  const [page, setPage] = useState(1);
  const resource = useResource<WearLog[]>("history?page=" + page);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LES TENUES QUI ONT VÉCU</p>
          <h1>Mon historique</h1>
          <p className="muted">
            Vos tenues réellement portées, au fil des jours.
          </p>
        </div>
      </div>
      <ResourceState {...resource} retry={resource.reload} />
      {resource.data &&
        (resource.data.length ? (
          <div className="history-list">
            {resource.data.map((log) => (
              <article className="panel history-row" key={log.id}>
                <time dateTime={log.wornDate.slice(0, 10)}>
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(log.wornDate))}
                </time>
                <div>
                  <h2>{log.outfitName}</h2>
                  <p className="muted">{log.variantName}</p>
                  <p className="small">
                    {log.items.map((i) => i.itemName).join(" · ")}
                  </p>
                  {log.note && <p>{log.note}</p>}
                </div>
                <span className="badge badge-success">Portée</span>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Votre histoire commence bientôt."
            description="Marquez une tenue comme portée pour la retrouver ici."
          />
        ))}
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
          disabled={(resource.data?.length ?? 0) < 48}
          onClick={() => setPage(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </>
  );
}
