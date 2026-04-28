import type { CodegenConfig } from "@graphql-codegen/cli";

/**
 * Generates a TypeScript const-enum + matching type union for every GraphQL
 * `enum` in our schema. The output is the single source of truth that
 * `activities.ts` builds on (e.g. `ActivityLabel: Record<Activity, string>`),
 * so adding a value in `schema.graphql` forces a TypeScript error wherever
 * the new key isn't handled.
 */
const config: CodegenConfig = {
  schema: "./schema.graphql",
  generates: {
    "src/activities.generated.ts": {
      plugins: ["typescript"],
      config: {
        onlyEnums: true,
        enumsAsConst: true,
        namingConvention: "keep",
      },
    },
  },
};

export default config;
