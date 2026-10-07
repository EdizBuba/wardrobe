"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <h1>Impossible d’afficher cette page.</h1>
      <p>Réessayez dans un instant.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
