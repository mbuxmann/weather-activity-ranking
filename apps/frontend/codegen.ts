import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../../packages/contracts/schema.graphql",
  documents: ["src/**/*.graphql"],
  generates: {
    "src/api/generated.ts": {
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
      config: {
        enumsAsTypes: true
      }
    }
  }
};

export default config;
