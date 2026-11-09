import { createHashRouter, Navigate } from "react-router";
import { AppShell } from "./AppShell";
import { LoadingScreen } from "./LoadingScreen";
import { onboardingLoader, rootLoader } from "./boot";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { RepertoirePage } from "../features/repertoire/RepertoirePage";
import { PieceDetailPage } from "../features/repertoire/PieceDetailPage";
import { PracticeSetupPage } from "../features/workspace/PracticeSetupPage";
import { PracticePage } from "../features/workspace/PracticePage";
import { ToolsPage } from "../features/workspace/ToolsPage";
import { ChangelogPage } from "../features/changelog/ChangelogPage";
import { SessionsPage } from "../features/sessions/SessionsPage";
import { SessionDetailPage } from "../features/sessions/SessionDetailPage";

function Placeholder({ name }: { name: string }) {
  return (
    <section className="placeholder">
      <p className="eyebrow">CRESS</p>
      <h1>{name}</h1>
      <p>Esta área será implementada nas próximas fases.</p>
    </section>
  );
}

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
      { path: "changelog", element: <ChangelogPage /> },
      { path: "repertoire", element: <RepertoirePage /> },
      { path: "repertoire/:pieceId", element: <PieceDetailPage /> },
      { path: "practice/new", element: <PracticeSetupPage /> },
      { path: "practice/:sessionId", element: <PracticePage /> },
      { path: "sessions", element: <SessionsPage /> },
      { path: "sessions/:sessionId", element: <SessionDetailPage /> },
      { path: "tools", element: <ToolsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
