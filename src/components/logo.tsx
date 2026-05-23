import * as React from "react";

import { cn } from "@/lib/utils";

export type LogoProps = React.SVGAttributes<SVGSVGElement>;

/**
 * Stijlvolle kledinghanger als logo voor My Wardrobe.
 * Gebruikt `currentColor` zodat de hanger meekleurt met de context
 * (bijv. wit op de primaire knop, primair op een lichte achtergrond).
 */
export function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Stang en hangerhaak */}
      <path d="M16 12 V8 C16 6 17 4 19 4 S22 5 22 7" />
      {/* Driehoekig frame */}
      <path d="M16 12 L4 22 H28 Z" />
    </svg>
  );
}
