import "./registerModels.js";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`[server] listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error("[server] failed to start:", error);
  process.exit(1);
});
