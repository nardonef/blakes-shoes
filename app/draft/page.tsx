import { getDraftModel } from "@/lib/draft-board";
import DraftClient from "./DraftClient";

export const metadata = { title: "Draft | Blake's Shoes" };

// The draft model is built from the full lineups/transactions tables on the server; only the
// per-pick summary reaches the client.
export default function DraftPage() {
  return <DraftClient model={getDraftModel()} />;
}
