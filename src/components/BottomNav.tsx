"use client";

import { BookOpen, Camera, House, ListChecks, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  emphasized?: boolean;
}

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/scan", label: "Scan", icon: Camera, emphasized: true },
  { href: "/saved", label: "Saved", icon: BookOpen },
  { href: "/grocery", label: "Grocery", icon: ListChecks },
  { href: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Floating black pill nav: active tab is a green pill with label, others are white circles. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2"
    >
      <ul className="flex items-center gap-1.5 rounded-full bg-night p-1.5 shadow-float">
        {TABS.map(({ href, label, icon: Icon, emphasized }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={active ? undefined : label}
                className={cn(
                  "flex h-11 items-center justify-center rounded-full transition-all duration-300 motion-safe:active:scale-95",
                  active
                    ? "gap-2 bg-olive px-4 text-[15px] font-semibold text-white"
                    : "w-11 bg-white text-ink hover:bg-canvas",
                  !active && emphasized && "text-olive-700 ring-[3px] ring-olive ring-inset",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active || emphasized ? 2.2 : 1.8} aria-hidden />
                {active && <span>{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
