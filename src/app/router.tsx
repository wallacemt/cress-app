import { createHashRouter, Navigate } from "react-router";
import { AppShell } from "./AppShell";
import { onboardingLoader, rootLoader } from "./boot";

function Placeholder({ name }: { name: string }) {
  return (
    <section className="placeholder">
      <p className="eyebrow">CRESS</p>
      <h1>{name}</h1>
      <p>Esta área será implementada nas próximas fases.</p>
    </section>
  );
}

const placeholderRoutes = [
  "/repertoire",
  "/practice/new",
  "/practice/:sessionId",
  "/sessions",
  "/sessions/:sessionId",
  "/tools",
  "/settings",
];

export const router = createHashRouter([
  {
    path: "/onboarding",
    loader: onboardingLoader,
    element: <Placeholder name="Onboarding" />,
  },
  {
    path: "/",
    loader: rootLoader,
    element: <AppShell />,
    children: [
      { index: true, element: <Placeholder name="Dashboard" /> },
      ...placeholderRoutes.map((path) => ({
        path: path.slice(1),
        element: <Placeholder name={path} />,
      })),
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
