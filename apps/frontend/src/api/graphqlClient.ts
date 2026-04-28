import { cacheExchange, createClient, fetchExchange } from "urql";

export const graphqlClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:4000/graphql",
  exchanges: [cacheExchange, fetchExchange]
});
