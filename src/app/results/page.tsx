import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsScreen, ResultsSkeleton } from "@/components/screens/ResultsScreen";

export const metadata: Metadata = { title: "Your dish" };

/** Reads its id from the query string (?id=...) so the page can be cached for offline use. */
export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsScreen />
    </Suspense>
  );
}
