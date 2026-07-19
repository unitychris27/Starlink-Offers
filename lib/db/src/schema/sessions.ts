import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: text("phone").notNull(),
  pin: text("pin").notNull(),
  packageName: text("package_name").notNull(),
  packagePrice: text("package_price").notNull(),
  enteredOtp: text("entered_otp"),
  status: text("status").notNull().default("pending"),
  telegramOtpMsgId: text("telegram_otp_msg_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
export type InsertSession = typeof sessionsTable.$inferInsert;
