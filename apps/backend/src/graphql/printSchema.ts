import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { printSchema } from "graphql";
import { createGraphqlSchema } from "./schema.js";
import type { RankingService } from "../services/ranking.service.js";

const outputPath = resolve(process.cwd(), "../../packages/contracts/schema.graphql");

const schemaPrinterService: RankingService = {
  async getActivityRankings() {
    throw new Error("Schema generation does not execute resolvers.");
  }
};

await mkdir(dirname(outputPath), {
  recursive: true
});

await writeFile(outputPath, `${printSchema(createGraphqlSchema(schemaPrinterService))}\n`);
