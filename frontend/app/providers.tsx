"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { EntitlementsProvider } from "@/lib/useEntitlements";
import { CameraProvider } from "@/context/CameraContext";
import { NotificationProvider } from "@/context/NotificationContext";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({
  children,
}: ProvidersProps) {
  return (
    <AuthProvider>
      <EntitlementsProvider>
        <CameraProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </CameraProvider>
      </EntitlementsProvider>
    </AuthProvider>
  );
}