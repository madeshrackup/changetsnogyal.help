import { HomeBoard } from "./home-board";
import { isBoardAuthConfigured } from "@/lib/board-session";

export default function Page() {
  return <HomeBoard showLogout={isBoardAuthConfigured()} />;
}
