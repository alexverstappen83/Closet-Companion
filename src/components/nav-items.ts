import {
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  Shirt,
  Sparkles,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/closet", label: "Kledingkast", icon: Shirt },
  { href: "/outfits", label: "Outfits", icon: Layers },
  { href: "/advice", label: "Stijladvies", icon: Sparkles },
  { href: "/reference-photos", label: "Referentiefoto's", icon: ImageIcon },
  { href: "/budget", label: "AI-budget", icon: Wallet },
  { href: "/profile", label: "Profiel", icon: User },
];

export const adminNavItem: NavItem = {
  href: "/admin/users",
  label: "Beheer",
  icon: Users,
};

export const mobileNavItems: NavItem[] = [
  { href: "/dashboard", label: "Start", icon: LayoutDashboard },
  { href: "/closet", label: "Kast", icon: Shirt },
  { href: "/outfits", label: "Outfits", icon: Layers },
  { href: "/advice", label: "Advies", icon: Sparkles },
  { href: "/profile", label: "Profiel", icon: User },
];
