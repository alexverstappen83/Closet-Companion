import Link from "next/link";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isRegistrationOpen } from "@/lib/registration";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage() {
  const registrationOpen = await isRegistrationOpen();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welkom terug</CardTitle>
        <CardDescription>
          Log in om je kledingkast en stijladvies te bekijken.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        {registrationOpen && (
          <p className="text-center text-sm text-muted-foreground">
            Nog geen account ingericht?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Eerste account aanmaken
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
