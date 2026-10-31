import React from "react";
import { BrandWordmark } from "@/components/brand";

export function AuthBackdrop() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Radiant Focus & Space Atmosphere Auras */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-[#FF4500]/12 blur-[160px]" />
      <div className="absolute -bottom-32 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[150px]" />
    </div>
  );
}

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-transparent px-4 py-14 sm:py-20 text-white selection:bg-[#FF4500] selection:text-white">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="mb-8 flex items-center justify-center">
      <BrandWordmark size="lg" href="/" />
    </div>
  );
}

