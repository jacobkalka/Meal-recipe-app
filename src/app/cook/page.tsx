import type { Metadata } from "next";
import { Suspense } from "react";
import { CookScreen } from "@/components/screens/CookScreen";

export const metadata: Metadata = { title: "Cooking mode" };

/** Reads its id from the query string (?id=...) so the page can be cached for offline use. */
export default function CookPage() {
  return (
    <Suspense fallback={null}>
      <CookScreen />
    </Suspense>
  );
}
