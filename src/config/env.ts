import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) => /^postgres(ql)?:/.test(value),
      "PostgreSQL connection URL required",
    )
    .default("postgresql://wardrobe:wardrobe@localhost:5432/wardrobe"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .default("development-only-change-this-secret-32-chars"),
  MEDIA_ROOT: z.string().default("./media"),
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  SMTP_URL: z
    .url()
    .refine((value) => /^smtps?:/.test(value), "SMTP connection URL required")
    .optional(),
  EMAIL_FROM: z.string().optional(),
});
export function readEnvironment(input: NodeJS.ProcessEnv = process.env) {
  const value = schema.parse(input);
  if (
    input.NODE_ENV === "production" &&
    input.NEXT_PHASE !== "phase-production-build"
  ) {
    if (
      !input.BETTER_AUTH_SECRET ||
      value.BETTER_AUTH_SECRET.includes("development") ||
      value.BETTER_AUTH_SECRET.includes("replace-")
    )
      throw new Error("A production authentication secret is required");
    if (!input.DATABASE_URL || !value.BETTER_AUTH_URL.startsWith("https://"))
      throw new Error("Production requires a database and HTTPS origin");
    if (value.EMAIL_PROVIDER !== "smtp" || !value.SMTP_URL || !value.EMAIL_FROM)
      throw new Error("Production email delivery must be configured");
  }
  return value;
}
export const env = readEnvironment();
