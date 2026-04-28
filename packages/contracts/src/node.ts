// Node.js-only exports. Do NOT import this from browser code.

import { fileURLToPath } from "node:url";

export const schemaPath = fileURLToPath(new URL("../schema.graphql", import.meta.url));
