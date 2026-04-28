import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const port = Number(process.env.PORT ?? 4000);

serve({
  fetch: createApp().fetch,
  port
});

logger.info({ port }, "Backend listening");
