import type { Metadata } from "next";
import ReviewClient from "./ReviewClient";

export const metadata: Metadata = { title: "Review | MindEase", robots: { index: false, follow: false } };

/**
 * The human review page. It renders what GET /api/admin/review returns:
 * aggregate counts across everyone, no message text, no names, no memories.
 * A person reads it, decides, authors a change, and `npm run gate` decides
 * whether that change ships. Nothing on this page changes the product.
 */
export default function ReviewPage() {
  return <ReviewClient />;
}
