import type { Metadata } from "next";
import { GroceryScreen } from "@/components/screens/GroceryScreen";

export const metadata: Metadata = { title: "Grocery list" };

export default function GroceryPage() {
  return <GroceryScreen />;
}
