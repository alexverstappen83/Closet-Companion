"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import { adminNavItem, navItems, type NavItem } from "@/components/nav-items";
import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

export function AppSidebar({
  isAdmin,
  name,
  email,
}: {
  isAdmin: boolean;
  name?: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Logo className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">My Wardrobe</p>
          <p className="text-xs text-muted-foreground">Digitale kledingkast</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Beheer
            </p>
            <NavLink item={adminNavItem} active={isActive(adminNavItem.href)} />
          </>
        )}
      </nav>

      <div className="border-t px-3 py-3">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{name ?? "Gebruiker"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
