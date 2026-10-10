import { it, expect } from "vitest";
import { readEnvironment } from "@/config/env";
it("requires production HTTPS, a real secret and an email provider", () => {
  expect(() => readEnvironment({ NODE_ENV: "production" })).toThrow();
  const valid: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:password@localhost/db",
    BETTER_AUTH_SECRET: "a-production-test-secret-with-48-characters",
    BETTER_AUTH_URL: "https://wardrobe.example.com",
    EMAIL_PROVIDER: "smtp",
    SMTP_URL: "smtps://example.com:465",
    EMAIL_FROM: "hello@example.com",
  };
  expect(readEnvironment(valid).EMAIL_PROVIDER).toBe("smtp");
  expect(() =>
    readEnvironment({
      ...valid,
      BETTER_AUTH_URL: "http://wardrobe.example.com",
    }),
  ).toThrow();
  expect(() =>
    readEnvironment({ ...valid, EMAIL_PROVIDER: "console" }),
  ).toThrow();
});
