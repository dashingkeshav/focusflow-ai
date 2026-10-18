import type { Metadata } from "next";
import CheckoutClient from "@/components/billing/CheckoutClient";

export const metadata: Metadata = {
  title: "Secure checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
