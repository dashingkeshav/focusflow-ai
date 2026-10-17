import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage subscription",
  robots: { index: false, follow: false },
};

export default function BillingManagementLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
