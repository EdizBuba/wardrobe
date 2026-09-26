"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Layers, ArrowRight } from "lucide-react";
import { authClient } from "../client";
import { product } from "@/config/product";
import { Button } from "@/components/ui/button";
export function AuthForm({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const titles = {
    login: "Heureux de vous retrouver.",
    register: "Votre style commence ici.",
    forgot: "On vous aide à revenir.",
    reset: "Un nouveau départ.",
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "");
    const password = String(fields.get("password") ?? "");
    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              name: String(fields.get("name")),
              email,
              password,
              callbackURL: "/today",
            })
          : mode === "login"
            ? await authClient.signIn.email({ email, password })
            : mode === "forgot"
              ? await authClient.requestPasswordReset({
                  email,
                  redirectTo: "/reset-password",
                })
              : await authClient.resetPassword({
                  newPassword: password,
                  token: params.get("token") ?? "",
                });
      if (result.error) {
        setError(result.error.message ?? "Impossible de continuer.");
        return;
      }
      if (mode === "forgot")
        setMessage(
          "Si ce compte existe, un lien de réinitialisation a été envoyé.",
        );
      else if (mode === "reset") {
        setMessage("Mot de passe modifié. Vous pouvez vous connecter.");
      } else if (
        mode === "register" &&
        !(result.data && "token" in result.data && result.data.token)
      )
        setMessage("Vérifiez votre e-mail pour activer votre compte.");
      else {
        router.push("/today");
        router.refresh();
      }
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-aside">
        <div className="brand">
          <Layers />
          {product.name}.
        </div>
        <p className="eyebrow">LE STYLE, SANS L’HÉSITATION</p>
        <h1>
          Une garde-robe.
          <br />
          Mille possibilités.
        </h1>
        <p>
          Retrouvez vos pièces, composez vos tenues et préparez votre quotidien.
        </p>
        <div className="auth-illustration">
          <Layers size={140} strokeWidth={0.7} />
        </div>
        <span>Votre garde-robe reste privée.</span>
      </section>
      <section className="auth-main">
        <div className="auth-form">
          <p className="eyebrow">{product.name}</p>
          <h2>{titles[mode]}</h2>
          <p className="muted">
            {mode === "login"
              ? "Connectez-vous à votre garde-robe personnelle."
              : mode === "register"
                ? "Quelques détails, et tout devient plus simple."
                : "Retrouvez l’accès à votre compte."}
          </p>
          <form onSubmit={submit} className="form-stack">
            {mode === "register" && (
              <label>
                Votre prénom
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Adresse e-mail
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Mot de passe
                <input
                  name="password"
                  type="password"
                  required
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
                <span className="field-help">
                  {mode !== "login" ? "Au moins 12 caractères." : ""}
                </span>
              </label>
            )}
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
            <Button disabled={pending}>
              {pending
                ? "Un instant…"
                : mode === "login"
                  ? "Se connecter"
                  : mode === "register"
                    ? "Créer mon compte"
                    : mode === "forgot"
                      ? "Recevoir un lien"
                      : "Modifier le mot de passe"}
              <ArrowRight size={17} />
            </Button>
          </form>
          <div className="auth-links">
            {mode === "login" ? (
              <>
                <Link href="/forgot-password">Mot de passe oublié ?</Link>
                <p>
                  Pas encore de compte ?{" "}
                  <Link href="/register">Créer un compte</Link>
                </p>
              </>
            ) : (
              <Link href="/login">Revenir à la connexion</Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
