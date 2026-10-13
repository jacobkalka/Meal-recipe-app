import type { Metadata } from "next";
import { SavedScreen } from "@/components/screens/SavedScreen";

export const metadata: Metadata = { title: "Saved recipes" };

export default function SavedPage() {
  return <SavedScreen />;
}
