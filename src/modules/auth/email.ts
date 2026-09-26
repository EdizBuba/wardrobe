import nodemailer from "nodemailer";
import { env } from "@/config/env";
export interface EmailProvider {
  send(to: string, subject: string, url: string): Promise<void>;
}
export const emailProvider: EmailProvider = {
  async send(to, subject, url) {
    if (env.EMAIL_PROVIDER === "console") {
      if (process.env.NODE_ENV === "production")
        throw new Error("Console email prohibited in production");
      console.info(
        JSON.stringify({ event: "development_email", to, subject, url }),
      );
      return;
    }
    await nodemailer.createTransport(env.SMTP_URL!).sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      text: subject + "\n\n" + url,
    });
  },
};
