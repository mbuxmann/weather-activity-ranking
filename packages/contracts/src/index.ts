import { fileURLToPath } from "node:url";

export const schemaPath = fileURLToPath(new URL("../schema.graphql", import.meta.url));
