import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "urql";
import { graphqlClient } from "./api/graphqlClient";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Provider value={graphqlClient}>
      <App />
    </Provider>
  </StrictMode>
);
