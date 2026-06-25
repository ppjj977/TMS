import nodemailer, { Transporter } from "nodemailer";
import { prisma } from "./prisma";

// Email delivery with a graceful fallback.
//
// If SMTP_* env vars are set, mail is sent via SMTP. Otherwise every message is
// recorded to the NotificationLog table (status LOGGED) and printed to the
// console, so the app is fully functional in development and the operator has
// an audit trail either way.

export interface EmailMessage {
  to: string;
  subject: string;
  body: string; // plain text
  jobId?: string;
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

let transporter: Transporter | null = null;
function getTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

const from = () => process.env.SMTP_FROM || "TMS <no-reply@tms.local>";

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!msg.to) return; // nothing to send to

  if (smtpConfigured()) {
    try {
      await getTransport().sendMail({
        from: from(),
        to: msg.to,
        subject: msg.subject,
        text: msg.body,
      });
      await record(msg, "SENT");
    } catch (err) {
      await record(msg, "FAILED", err instanceof Error ? err.message : String(err));
    }
    return;
  }

  // No SMTP configured — log only.
  console.log(`[email:logged] to=${msg.to} subject="${msg.subject}"`);
  await record(msg, "LOGGED");
}

async function record(
  msg: EmailMessage,
  status: "SENT" | "LOGGED" | "FAILED",
  error?: string,
) {
  try {
    await prisma.notificationLog.create({
      data: {
        channel: "email",
        to: msg.to,
        subject: msg.subject,
        body: msg.body,
        status,
        error,
        jobId: msg.jobId,
      },
    });
  } catch {
    // Never let logging failures break the user flow.
  }
}
