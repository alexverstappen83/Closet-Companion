import Link from "next/link";
import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isRegistrationOpen } from "@/lib/registration";

import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account aanmaken" };

export default async function RegisterPage() {
  const registrationOpen = await isRegistrationOpen();

  if (!registrationOpen) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle>Registratie is gesloten</CardTitle>
          <CardDescription>
            Deze applicatie is privé. Nieuwe accounts worden door een beheerder
            aangemaakt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Terug naar inloggen</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eerste account aanmaken</CardTitle>
        <CardDescription>
          Jij bent de eerste gebruiker en wordt automatisch beheerder. Daarna
          sluit de openbare registratie.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
