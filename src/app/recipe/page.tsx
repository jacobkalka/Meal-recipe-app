import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipeScreen } from "@/components/screens/RecipeScreen";

export const metadata: Metadata = { title: "Recipe" };

/** Reads its id from the query string (?id=...) so the page can be cached for offline use. */
export default function RecipePage() {
  return (
    <Suspense fallback={null}>
      <RecipeScreen />
    </Suspense>
  );
}
