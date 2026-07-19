import app from "./app";
import { logger } from "./lib/logger";
import { startPolling } from "./lib/telegram";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Only poll in production — prevents dev and prod servers competing
  // for the same Telegram updates when both run simultaneously.
  if (process.env.NODE_ENV === "production") {
    startPolling();
  } else {
    logger.info("Skipping Telegram polling in development mode");
  }
});
