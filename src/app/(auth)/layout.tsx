import { Logo } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-accent/60 via-background to-background px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Logo className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Wardrobe
          </h1>
          <p className="text-sm text-muted-foreground">
            Jouw slimme digitale kledingkast
          </p>
        </div>
      </div>
      <div className="w-full max-w-sm animate-fade-in">{children}</div>
    </div>
  );
}
