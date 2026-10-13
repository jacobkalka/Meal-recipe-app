import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { TimerProvider } from "@/components/timers/TimerProvider";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { AppDataProvider } from "@/lib/data/store";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: `${APP_TAGLINE}. Photograph a restaurant meal and get a home recipe, grocery list and step-by-step cooking guide.`,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f4f4f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-canvas text-ink">
        <AppDataProvider>
          <TimerProvider>
            <AppShell>{children}</AppShell>
          </TimerProvider>
        </AppDataProvider>
      </body>
    </html>
  );
}
