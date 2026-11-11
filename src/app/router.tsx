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
import { DashboardPage } from "../features/dashboard/DashboardPage";

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
      { index: true, element: <DashboardPage /> },
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
