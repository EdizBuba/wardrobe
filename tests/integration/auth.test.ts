import { afterAll, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { auth } from "@/modules/auth/auth";
import { emailProvider } from "@/modules/auth/email";
import { db } from "@/lib/db";
import { cleanupUsers } from "../fixtures";
const email = randomUUID() + "@example.test";
const password = "Initial-test-password-2026";
const sent: { subject: string; url: string }[] = [];
const sendSpy = vi
  .spyOn(emailProvider, "send")
  .mockImplementation(async (_to, subject, url) => {
    sent.push({ subject, url });
  });
async function call(path: string, data: unknown, cookie?: string) {
  return auth.handler(
    new Request("http://localhost:3000/api/auth/" + path, {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(data),
    }),
  );
}
afterAll(async () => {
  sendSpy.mockRestore();
  const user = await db.user.findUnique({ where: { email } });
  if (user) await cleanupUsers([user.id]);
  await db.$disconnect();
});
it("verifies email, resets passwords, spends reset tokens and revokes existing sessions", async () => {
  const registered = await call("sign-up/email", {
    email,
    password,
    name: "Auth test",
  });
  expect(registered.ok).toBe(true);
  const verification = sent.find((m) => m.subject.includes("Vérifier"));
  expect(verification).toBeDefined();
  const verified = await auth.handler(new Request(verification!.url));
  expect(verified.status).toBeLessThan(400);
  expect(
    (await db.user.findUniqueOrThrow({ where: { email } })).emailVerified,
  ).toBe(true);
  const login = await call("sign-in/email", { email, password });
  expect(login.ok).toBe(true);
  const cookie = login.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  expect(
    await auth.api.getSession({ headers: new Headers({ cookie }) }),
  ).not.toBeNull();
  const requested = await call("request-password-reset", {
    email,
    redirectTo: "/reset-password",
  });
  expect(requested.ok).toBe(true);
  const resetUrl = sent.find((m) => m.subject.includes("Réinitialiser"))!.url;
  const redirect = await auth.handler(new Request(resetUrl));
  const token = new URL(
    redirect.headers.get("location")!,
    "http://localhost:3000",
  ).searchParams.get("token");
  expect(token).toBeTruthy();
  const newPassword = "Replacement-test-password-2026";
  expect((await call("reset-password", { token, newPassword })).ok).toBe(true);
  expect((await call("reset-password", { token, newPassword })).ok).toBe(false);
  expect(
    await auth.api.getSession({ headers: new Headers({ cookie }) }),
  ).toBeNull();
  expect((await call("sign-in/email", { email, password })).ok).toBe(false);
  expect(
    (await call("sign-in/email", { email, password: newPassword })).ok,
  ).toBe(true);
});
