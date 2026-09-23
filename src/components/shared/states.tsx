import { Button } from "@/components/ui/button";
export function ResourceState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
}) {
  return loading ? (
    <p className="loading" role="status">
      Chargement…
    </p>
  ) : error ? (
    <div className="error" role="alert">
      {error}
      <Button variant="outline" onClick={retry}>
        Réessayer
      </Button>
    </div>
  ) : null;
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">＋</div>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {children}
    </div>
  );
}
