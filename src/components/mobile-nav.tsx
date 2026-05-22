"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt } from "lucide-react";

import { mobileNavItems } from "@/components/nav-items";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shirt className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">Closet Companion</span>
      </div>
      <div className="text-xs">
        <SignOutButton />
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card/95 backdrop-blur lg:hidden">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
