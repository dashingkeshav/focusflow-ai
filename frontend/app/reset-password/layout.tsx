import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Set a strong new password for your FocusFlow AI account.",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
