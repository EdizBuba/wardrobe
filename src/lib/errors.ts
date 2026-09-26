export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function notFound(resource: string): never {
  throw new AppError(resource + "_NOT_FOUND", "Ressource introuvable.", 404);
}
