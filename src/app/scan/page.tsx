import type { Metadata } from "next";
import { ScanScreen } from "@/components/screens/ScanScreen";

export const metadata: Metadata = { title: "Scan a meal" };

export default function ScanPage() {
  return <ScanScreen />;
}
