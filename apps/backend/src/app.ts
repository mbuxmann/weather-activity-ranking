import { Hono } from "hono";
import { cors } from "hono/cors";
import { createYogaHandler } from "./graphql/yoga.js";
import { createRankingService, type RankingService } from "./services/ranking.service.js";

type CreateAppOptions = {
  rankingService?: RankingService;
};

export const createApp = ({ rankingService = createRankingService() }: CreateAppOptions = {}) => {
  const app = new Hono();
  const yoga = createYogaHandler(rankingService);

  app.use(
    "/graphql",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"]
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
