import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNav, MobileTopBar } from "@/components/mobile-nav";
import { requireUser } from "@/lib/guards";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar isAdmin={isAdmin} name={user.name} email={user.email} />
      <MobileTopBar />
      <main className="lg:pl-64">
        <div className="container max-w-6xl py-6 pb-24 lg:py-10 lg:pb-12">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
