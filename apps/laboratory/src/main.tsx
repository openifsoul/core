import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "./components/Landing";
import { ServicePolicies } from "./components/ServicePolicies";
import "./styles.css";
import { RuntimeBootstrap } from "./lib/runtime-auth";

const Demo = lazy(() =>
  import("./components/Demo").then((module) => ({ default: module.Demo })),
);
const Application = lazy(() =>
  import("./App").then((module) => ({ default: module.App })),
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {["/privacy", "/terms"].includes(window.location.pathname) ? (
      <ServicePolicies
        page={window.location.pathname === "/privacy" ? "privacy" : "terms"}
      />
    ) : window.location.pathname === "/" ? (
      <Landing />
    ) : (
      <Suspense
        fallback={
          <main className="connection-state" role="status">
            Opening IfSoul…
          </main>
        }
      >
        <RuntimeBootstrap>
          {window.location.pathname === "/demo" ? <Demo /> : <Application />}
        </RuntimeBootstrap>
      </Suspense>
    )}
  </StrictMode>,
);
