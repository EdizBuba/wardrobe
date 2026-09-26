import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { db } from "@/lib/db";
import { env } from "@/config/env";
import { emailProvider } from "./email";
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
  trustedOrigins: [env.BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: process.env.NODE_ENV === "production",
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      emailProvider.send(user.email, "Réinitialiser votre mot de passe", url),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) =>
      emailProvider.send(user.email, "Vérifier votre adresse e-mail", url),
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    database: { generateId: "uuid" },
  },
});
