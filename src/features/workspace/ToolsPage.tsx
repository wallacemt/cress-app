import { useNavigate } from "react-router";
import { Workspace } from "./Workspace";

export function ToolsPage() {
  const navigate = useNavigate();
  return <Workspace mode="free" onBack={() => navigate("/")} />;
}
