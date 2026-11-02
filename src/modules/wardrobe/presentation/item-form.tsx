"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/shared/dialog";
import { ItemImage } from "@/components/shared/visuals";
import { useApp } from "@/components/layout/app-shell";
import { api, jsonBody } from "@/lib/api-client";
import type { Item } from "@/modules/shared/presentation/types";
import { categories, statuses, conditions } from "@/config/labels";
import { useResource } from "@/components/shared/use-resource";
type Fields = {
  name: string;
  category: string;
  locationId: string;
  status: string;
  condition: string;
  brand: string;
  size: string;
  primaryColor: string;
  sourceUrl: string;
  notes: string;
  favorite: boolean;
};
type Preview = {
  name?: string;
  brand?: string;
  color?: string;
  description?: string;
  priceCents?: number;
  currency?: string;
  sourceUrl: string;
  imageDataUrl?: string;
  blocked?: boolean;
};
const subscribeToClipboard = () => () => {};
const canReadClipboard = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.clipboard?.read === "function" &&
  !/firefox/i.test(navigator.userAgent);
const cannotReadClipboard = () => false;
function dataUrlToFile(dataUrl: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(header ?? "")?.[1] ?? "image/webp";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return new File([bytes], "article.webp", { type: mime });
}
export function ItemForm({
  item,
  onClose,
  onSaved,
}: {
  item?: Item;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { locations, locationId } = useApp();
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<Fields>({
    defaultValues: {
      name: item?.name ?? "",
      category: item?.category ?? "TOP",
      locationId: item?.locationId ?? locationId,
      status: item?.status ?? "AVAILABLE",
      condition: item?.condition ?? "GOOD",
      brand: item?.brand ?? "",
      size: item?.size ?? "",
      primaryColor: item?.primaryColor ?? "",
      sourceUrl: item?.sourceUrl ?? "",
      notes: item?.notes ?? "",
      favorite: item?.favorite ?? false,
    },
  });
  const [photo, setPhoto] = useState<File>();
  const [photoPreview, setPhotoPreview] = useState<string>();
  const photoUrl = useRef<string | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savedId, setSavedId] = useState(item?.id);
  const clipboardButton = useSyncExternalStore(
    subscribeToClipboard,
    canReadClipboard,
    cannotReadClipboard,
  );
  const detail = useResource<
    Item & {
      wearItems: {
        wearLog: { id: string; wornDate: string; outfitName: string };
      }[];
    }
  >(item ? "items/" + item.id : null);
  const displayedItem = detail.data ?? item;
  useEffect(
    () => () => {
      if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    },
    [],
  );
  const setPhotoFile = useCallback((file?: File) => {
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current);
    photoUrl.current = file ? URL.createObjectURL(file) : undefined;
    setPhotoPreview(photoUrl.current);
    setPhoto(file);
  }, []);
  const choosePhoto = useCallback(
    (file?: File) => {
      if (!file) {
        setPhotoFile(undefined);
        return;
      }
      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
        setError("Choisis une image de moins de 8 Mo.");
        setPhotoFile(undefined);
        return;
      }
      setError("");
      setPhotoFile(file);
    },
    [setPhotoFile, setError],
  );
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      let file = event.clipboardData?.files?.[0];
      if (!file && event.clipboardData) {
        for (const item of Array.from(event.clipboardData.items)) {
          if (!item.type.startsWith("image/")) continue;
          file = item.getAsFile() ?? undefined;
          if (file) break;
        }
      }
      if (!file) return;
      event.preventDefault();
      choosePhoto(file);
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [choosePhoto]);
  function openFilePicker() {
    fileInput.current?.click();
  }
  async function importProduct() {
    const sourceUrl = getValues("sourceUrl").trim();
    if (!sourceUrl) {
      setError("Colle le lien de l'article.");
      return;
    }
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const preview = await api<Preview>("items/preview", {
        method: "POST",
        body: jsonBody({ url: sourceUrl }),
      });
      if (preview.blocked)
        setNotice(
          "Ce site bloque la récupération. Le nom et la marque sont remplis ; ajoute la photo avec Ctrl+V ou le sélecteur.",
        );
      if (preview.name && !getValues("name")) setValue("name", preview.name);
      if (preview.brand && !getValues("brand"))
        setValue("brand", preview.brand);
      if (preview.color && !getValues("primaryColor"))
        setValue("primaryColor", preview.color);
      if (preview.sourceUrl) setValue("sourceUrl", preview.sourceUrl);
      const price =
        preview.priceCents != null
          ? `Prix : ${(preview.priceCents / 100).toFixed(2).replace(".", ",")} ${preview.currency ?? "EUR"}`
          : "";
      const notes = [preview.description, price]
        .filter((value): value is string => Boolean(value))
        .join("\n\n");
      if (notes && !getValues("notes")) setValue("notes", notes.slice(0, 4000));
      if (preview.imageDataUrl) setPhotoFile(dataUrlToFile(preview.imageDataUrl));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setImporting(false);
    }
  }
  async function pastePhoto() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((value) => value.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        setPhotoFile(new File([blob], "article.webp", { type }));
        return;
      }
      setError("Aucune image dans le presse-papiers.");
    } catch {
      setError(
        "Impossible de lire le presse-papiers. Choisis un fichier ou glisse l’image.",
      );
    }
  }
  async function deletePhoto(id: string) {
    setPending(true);
    setError("");
    try {
      await api("images/" + id, { method: "DELETE" });
      detail.reload();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function save(fields: Fields) {
    setPending(true);
    setError("");
    try {
      const data = { ...fields, sourceUrl: fields.sourceUrl || null };
      const saved = await api<{ id: string }>(
        "items" + (savedId ? "/" + savedId : ""),
        {
          method: savedId ? "PATCH" : "POST",
          body: jsonBody({
            ...item,
            ...data,
            purchaseDate: item?.purchaseDate?.slice(0, 10) ?? null,
          }),
        },
      );
      setSavedId(saved.id);
      if (photo) {
        const form = new FormData();
        form.set("file", photo);
        await api("items/" + saved.id + "/images", {
          method: "POST",
          body: form,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(
        (e as Error).message +
          (photo
            ? " Si la pièce est déjà enregistrée, vous pouvez réessayer la photo."
            : ""),
      );
    } finally {
      setPending(false);
    }
  }
  async function archive() {
    if (!item) return;
    setPending(true);
    setError("");
    try {
      await api("items/" + item.id, { method: "DELETE" });
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
      title={item ? item.name : "Ajouter une pièce"}
      onClose={onClose}
      closeOnEscape={false}
    >
      <form onSubmit={handleSubmit(save)} className="form-stack">
        {displayedItem && (
          <div className="detail-image">
            <ItemImage item={displayedItem} full />
          </div>
        )}
        {displayedItem && displayedItem.images.length > 0 && (
          <div className="inline-actions">
            {displayedItem.images.map((image, index) => (
              <Button
                type="button"
                key={image.id}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => deletePhoto(image.id)}
              >
                Supprimer la photo {index + 1}
              </Button>
            ))}
          </div>
        )}
        <div className="import-row">
          <label>
            Lien de l’article <span className="muted">(facultatif)</span>
            <input
              {...register("sourceUrl")}
              type="url"
              placeholder="https://…"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={importProduct}
            disabled={pending || importing}
          >
            {importing ? "Récupération…" : "Récupérer"}
          </Button>
        </div>
        <p className="field-help">
          Colle le lien d’un article. Si le site bloque, ajoute la photo
          toi-même.
        </p>
        {notice && <p className="small muted">{notice}</p>}
        <div
          className="photo-drop"
          tabIndex={0}
          role="group"
          aria-label="Photo de la pièce"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) choosePhoto(file);
          }}
        >
          <span>
            Photo <span className="muted">(facultatif)</span>
          </span>
          <span className="field-help">
            Glisse une image ici, ou utilise les boutons ci-dessous. Ctrl+V
            fonctionne aussi. JPEG, PNG, WebP ou AVIF, jusqu’à 8 Mo.
          </span>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          hidden
          onChange={(event) => {
            choosePhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="inline-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFilePicker}
            disabled={pending || importing}
          >
            Choisir une photo
          </Button>
          {clipboardButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pastePhoto}
              disabled={pending || importing}
            >
              Coller l’image
            </Button>
          )}
        </div>
        {photoPreview && (
          <div className="photo-preview">
            <Image
              src={photoPreview}
              alt="Aperçu de la photo"
              width={220}
              height={220}
              unoptimized
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPhotoFile(undefined)}
            >
              Retirer la photo
            </Button>
          </div>
        )}
        <label>
          Nom de la pièce
          <input
            {...register("name", {
              required: "Un nom est nécessaire.",
              maxLength: 120,
            })}
            required
            maxLength={120}
            placeholder="Jean noir, chemise blanche…"
          />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </label>
        <div className="form-grid">
          <label>
            Catégorie
            <select aria-label="Catégorie" {...register("category")}>
              {Object.entries(categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Emplacement
            <select
              aria-label="Emplacement"
              {...register("locationId", { required: true })}
              required
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Disponibilité
            <select aria-label="Disponibilité" {...register("status")}>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            État
            <select aria-label="État" {...register("condition")}>
              {Object.entries(conditions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details>
          <summary>Quelques détails supplémentaires</summary>
          <div className="form-grid">
            <label>
              Marque
              <input {...register("brand")} maxLength={80} />
            </label>
            <label>
              Taille
              <input {...register("size")} maxLength={40} />
            </label>
            <label>
              Couleur principale
              <input {...register("primaryColor")} maxLength={40} />
            </label>
          </div>
          <label>
            Notes
            <textarea {...register("notes")} maxLength={4000} />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" {...register("favorite")} />
            Pièce favorite
          </label>
        </details>
        {detail.data && detail.data.wearItems.length > 0 && (
          <section>
            <h3>Dernières fois portée</h3>
            {detail.data.wearItems.map(({ wearLog }) => (
              <p className="small muted" key={wearLog.id}>
                {wearLog.wornDate.slice(0, 10)} · {wearLog.outfitName}
              </p>
            ))}
          </section>
        )}
        {item && (
          <p className="muted small">
            L’archivage conserve la pièce dans les tenues et l’historique.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {item && (
            <Button
              type="button"
              variant="destructive"
              onClick={archive}
              disabled={pending}
            >
              Archiver
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={pending || importing}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
