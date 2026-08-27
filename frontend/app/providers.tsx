"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({
  children,
}: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}