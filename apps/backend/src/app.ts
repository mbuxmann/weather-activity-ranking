import { Hono } from "hono";
import { cors } from "hono/cors";
import { createYogaHandler } from "./graphql/yoga.js";
import { createRankingService, type RankingService } from "./services/ranking.service.js";

type CreateAppOptions = {
  rankingService?: RankingService;
};

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

const parseCorsOrigins = (raw: string | undefined): string[] => {
  if (!raw) {
    return DEFAULT_CORS_ORIGINS;
  }
  const parsed = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  return parsed.length > 0 ? parsed : DEFAULT_CORS_ORIGINS;
};

export const createApp = ({ rankingService = createRankingService() }: CreateAppOptions = {}) => {
  const app = new Hono();
  const yoga = createYogaHandler(rankingService);
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

  app.use(
    "/graphql",
    cors({
      origin: corsOrigins
    })
  );

  app.get("/health", (context) =>
    context.json({
      ok: true
    })
  );

  app.all("/graphql", (context) => yoga.fetch(context.req.raw));

  return app;
};
