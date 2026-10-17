import { createHashRouter, Navigate } from "react-router";
import { AppShell } from "./AppShell";
import { LoadingScreen } from "./LoadingScreen";
import { onboardingLoader, rootLoader } from "./boot";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { SettingsPage } from "../features/settings/SettingsPage";

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
];

export const router = createHashRouter([
  {
    path: "/onboarding",
    loader: onboardingLoader,
    element: <OnboardingPage />,
    hydrateFallbackElement: <LoadingScreen />,
  },
  {
    path: "/",
    loader: rootLoader,
    element: <AppShell />,
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      { index: true, element: <Placeholder name="Dashboard" /> },
      { path: "settings", element: <SettingsPage /> },
      ...placeholderRoutes.map((path) => ({
        path: path.slice(1),
        element: <Placeholder name={path} />,
      })),
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
