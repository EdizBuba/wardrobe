"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  CalendarDays,
  Shirt,
  Layers,
  Sun,
  Settings,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { product } from "@/config/product";
import { api } from "@/lib/api-client";
import type { Me, Location } from "@/modules/shared/presentation/types";
type AppContextType = {
  me: Me | null;
  locations: Location[];
  locationId: string;
  setLocationId: (id: string) => void;
  refresh: () => Promise<void>;
};
const AppContext = createContext<AppContextType | null>(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("App context required");
  return context;
}
const links = [
  { href: "/today", label: "Aujourd’hui", icon: Sun },
  { href: "/wardrobe", label: "Garde-robe", icon: Shirt },
  { href: "/outfits", label: "Tenues", icon: Layers },
  { href: "/planner", label: "Planning", icon: CalendarDays },
  { href: "/settings", label: "Profil", icon: Settings },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocation] = useState("");
  const [error, setError] = useState("");
  const { setTheme } = useTheme();
  const appliedTheme = useRef<string | undefined>(undefined);
  const refresh = useCallback(async () => {
    const [profile, places] = await Promise.all([
      api<Me>("me"),
      api<Location[]>("locations"),
    ]);
    setMe(profile);
    setLocations(places);
    setLocation((current) =>
      places.some((l) => l.id === current)
        ? current
        : (profile.preference.defaultLocationId ?? places[0]?.id ?? ""),
    );
  }, []);
  useEffect(() => {
    if (me && appliedTheme.current !== me.preference.theme) {
      appliedTheme.current = me.preference.theme;
      setTheme(me.preference.theme);
    }
  }, [me, setTheme]);
  useEffect(() => {
    Promise.resolve()
      .then(refresh)
      .catch((e: Error) => setError(e.message));
  }, [refresh]);
  return (
    <AppContext.Provider
      value={{ me, locations, locationId, setLocationId: setLocation, refresh }}
    >
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>
      <aside className="sidebar">
        <Link href="/today" className="brand">
          <span className="brand-mark">
            <Layers size={22} />
          </span>
          {product.name}
          <span className="brand-dot">.</span>
        </Link>
        <p className="sidebar-caption">Un peu de vous, chaque jour.</p>
        <nav aria-label="Navigation principale">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                pathname.startsWith(href) ? "nav-link active" : "nav-link"
              }
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            Moins d’hésitation.
            <br />
            Plus de belles tenues.
          </p>
          <Link href="/history" className="nav-link">
            Historique <ArrowUpRight size={17} />
          </Link>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <span className="topbar-title">
            {product.name} /{" "}
            <strong>
              {links.find((l) => pathname.startsWith(l.href))?.label ??
                "Historique"}
            </strong>
          </span>
          <div className="location-control">
            <MapPin size={16} />
            <label className="sr-only" htmlFor="active-location">
              Emplacement actif
            </label>
            <select
              id="active-location"
              value={locationId}
              onChange={(e) => setLocation(e.target.value)}
            >
              {!locations.length && (
                <option value="">Créer un emplacement</option>
              )}
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        <main id="main">
          {error ? (
            <div className="error" role="alert">
              {error}
              <button
                onClick={() => {
                  setError("");
                  refresh().catch((e: Error) => setError(e.message));
                }}
              >
                Réessayer
              </button>
            </div>
          ) : !me ? (
            <p className="loading" role="status">
              Préparons votre garde-robe…
            </p>
          ) : (
            children
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navigation mobile">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname.startsWith(href) ? "active" : ""}
            aria-current={pathname.startsWith(href) ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </AppContext.Provider>
  );
}
