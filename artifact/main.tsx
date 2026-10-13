import { createRoot } from "react-dom/client";
import { AppShell } from "@/components/AppShell";
import { CookScreen } from "@/components/screens/CookScreen";
import { GroceryScreen } from "@/components/screens/GroceryScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { ProfileScreen } from "@/components/screens/ProfileScreen";
import { RecipeScreen } from "@/components/screens/RecipeScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { SavedScreen } from "@/components/screens/SavedScreen";
import { ScanScreen } from "@/components/screens/ScanScreen";
import { TimerProvider } from "@/components/timers/TimerProvider";
import { AppDataProvider } from "@/lib/data/store";
import { MemoryRouter, usePathname } from "./shims/navigation";

/** Entry point of the single-file build: the same screens, routed in memory. */

const ROUTES: Record<string, () => React.ReactNode> = {
  "/": HomeScreen,
  "/scan": ScanScreen,
  "/results": ResultsScreen,
  "/recipe": RecipeScreen,
  "/cook": CookScreen,
  "/grocery": GroceryScreen,
  "/saved": SavedScreen,
  "/profile": ProfileScreen,
};

function Routes() {
  const pathname = usePathname();
  const Screen = ROUTES[pathname] ?? HomeScreen;
  return <Screen key={pathname} />;
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <MemoryRouter>
      <AppDataProvider>
        <TimerProvider>
          <AppShell>
            <Routes />
          </AppShell>
        </TimerProvider>
      </AppDataProvider>
    </MemoryRouter>,
  );
}
