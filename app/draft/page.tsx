import { Pixelify_Sans } from "next/font/google";
import { getDraftModel } from "@/lib/draft-board";
import DraftClient from "./DraftClient";

export const metadata = { title: "Draft | Blake's Shoes" };

// Pixel font for the draft page's 16-bit mode (?bit=1). Not preloaded: it only downloads when the
// mode is switched on and the font is actually used.
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap", preload: false });

// The draft model is built from the full lineups/transactions tables on the server; only the
// per-pick summary reaches the client.
export default function DraftPage() {
  return (
    <div className={pixel.variable}>
      <DraftClient model={getDraftModel()} />
    </div>
  );
}
