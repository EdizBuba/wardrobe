"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, MapPin, Pencil, LogOut, Monitor, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useApp } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import type { Location } from "@/modules/shared/presentation/types";
import { LocationForm } from "@/modules/locations/presentation/location-form";
import { TimezoneSelect } from "./timezone-select";
import { api, jsonBody } from "@/lib/api-client";
import { authClient } from "@/modules/auth/client";
export function Settings() {
  const { me, locations, refresh } = useApp();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useState<Location | "new" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setMessage("");
    try {
      await api("me", {
        method: "PATCH",
        body: jsonBody({
          name: data.get("name"),
          timezone: data.get("timezone"),
          theme,
          defaultLocationId: data.get("defaultLocationId") || null,
        }),
      });
      await refresh();
      setMessage("Préférences enregistrées.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">À VOTRE IMAGE</p>
          <h1>Mon espace</h1>
          <p className="muted">Vos lieux, vos habitudes, vos préférences.</p>
        </div>
        <Button
          variant="outline"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await authClient.signOut();
            if (result.error) {
              setError(result.error.message ?? "Déconnexion impossible.");
              setPending(false);
            } else {
              router.push("/login");
              router.refresh();
            }
          }}
        >
          <LogOut size={17} />
          Se déconnecter
        </Button>
      </div>
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
      <div className="settings-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>Mes emplacements</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("new")}
            >
              <Plus size={16} />
              Ajouter
            </Button>
          </div>
          {!locations.length && (
            <p className="muted">
              Où gardez-vous vos vêtements ? Ajoutez votre premier lieu.
            </p>
          )}
          {locations.map((l) => (
            <div className="location-row" key={l.id}>
              <MapPin size={20} />
              <div>
                <h3>{l.name}</h3>
                {l.isDefault && (
                  <span className="badge badge-success">Par défaut</span>
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => setLocation(l)}
                aria-label={"Modifier " + l.name}
              >
                <Pencil size={17} />
              </Button>
            </div>
          ))}
          <Link href="/history" className="text-link">
            Mon historique de tenues →
          </Link>
        </section>
        <section className="panel">
          <h2>Mon profil</h2>
          <form className="form-stack" onSubmit={save}>
            <label>
              Prénom
              <input
                name="name"
                defaultValue={me!.user.name}
                required
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label>
              E-mail
              <input value={me!.user.email} readOnly type="email" />
            </label>
            <p className="small muted">
              {me!.user.emailVerified
                ? "Adresse vérifiée."
                : "Adresse en attente de vérification."}
            </p>
            {!me!.user.emailVerified && (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  const result = await authClient.sendVerificationEmail({
                    email: me!.user.email,
                    callbackURL: "/today",
                  });
                  setPending(false);
                  if (result.error)
                    setError(result.error.message ?? "Envoi impossible.");
                  else setMessage("Lien de vérification envoyé.");
                }}
              >
                Renvoyer le lien de vérification
              </Button>
            )}
            <TimezoneSelect defaultValue={me!.preference.timezone} />
            <label>
              Emplacement par défaut
              <select
                name="defaultLocationId"
                defaultValue={me!.preference.defaultLocationId ?? ""}
              >
                <option value="">Choisir un lieu</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Apparence</legend>
              <div className="theme-options">
                {[
                  { value: "light", label: "Clair", icon: Sun },
                  { value: "dark", label: "Sombre", icon: Moon },
                  { value: "system", label: "Système", icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={theme === value ? "default" : "outline"}
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                  >
                    <Icon size={17} />
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>
            <Button disabled={pending}>Enregistrer mes préférences</Button>
          </form>
          <p className="muted small">
            Pour modifier votre mot de passe, utilisez{" "}
            <Link href="/forgot-password" className="text-link">
              le lien de réinitialisation
            </Link>
            .
          </p>
        </section>
      </div>
      {location && (
        <LocationForm
          location={location === "new" ? undefined : location}
          onClose={() => setLocation(null)}
          onSaved={() => {
            refresh().catch((e: Error) => setError(e.message));
          }}
        />
      )}
    </>
  );
}
