import Image from "next/image";
import { Shirt, Heart, MapPin } from "lucide-react";
import type {
  Item,
  Availability,
  Variant,
  Location,
} from "@/modules/shared/presentation/types";
import { statuses } from "@/config/labels";
export function ItemImage({
  item,
  full = false,
  eager = false,
}: {
  item: Item;
  full?: boolean;
  eager?: boolean;
}) {
  return (
    <div className="item-image">
      {item.images[0] ? (
        <Image
          src={`/api/v1/images/${item.images[0].id}${full ? "" : "?thumbnail=1"}`}
          alt={item.name}
          fill
          unoptimized
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 600px) 45vw, 300px"
        />
      ) : (
        <div className="photo-placeholder">
          <Shirt size={52} strokeWidth={1} />
          <span>Photo à ajouter</span>
        </div>
      )}
    </div>
  );
}
export function Composition({
  variant,
  eager = false,
}: {
  variant: Variant;
  eager?: boolean;
}) {
  return (
    <div className="composition">
      {variant.items.slice(0, 4).map(({ item }) => (
        <ItemImage key={item.id} item={item} eager={eager} />
      ))}
    </div>
  );
}
export function AvailabilityBadge({
  availability,
}: {
  availability: Availability;
}) {
  const label =
    availability.status === "AVAILABLE"
      ? "Disponible ici"
      : availability.status === "PARTIALLY_AVAILABLE"
        ? "Partiellement disponible"
        : "Indisponible ici";
  return (
    <span
      className={`badge ${availability.status === "AVAILABLE" ? "badge-success" : "badge-warning"}`}
    >
      {label}
    </span>
  );
}
export function AvailabilityWarnings({
  availability,
  locations,
}: {
  availability: Availability;
  locations: Location[];
}) {
  if (!availability.reasons.length) return null;
  return (
    <ul className="warning-list">
      {availability.reasons.map((reason, i) => (
        <li key={i}>
          {reason.itemName} :{" "}
          {reason.code === "LOCATION"
            ? "à " +
              (locations.find((l) => l.id === reason.value)?.name ??
                "un autre emplacement")
            : reason.code === "STATUS"
              ? (statuses[reason.value ?? ""] ?? reason.value)
              : reason.code === "ARCHIVED"
                ? "pièce archivée"
                : "non accessible"}
        </li>
      ))}
    </ul>
  );
}
export function ItemCaption({ item }: { item: Item }) {
  return (
    <>
      <div className="card-title">
        <h3>{item.name}</h3>
        {item.favorite && <Heart size={16} aria-label="Favori" />}
      </div>
      <p className="muted small">
        <MapPin size={13} /> {item.location.name}
      </p>
      <span
        className={`badge ${item.status === "AVAILABLE" && !item.archivedAt ? "badge-success" : "badge-neutral"}`}
      >
        {item.archivedAt ? "Archivé" : statuses[item.status]}
      </span>
    </>
  );
}
