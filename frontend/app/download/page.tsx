import type { Metadata } from "next";
import DarkExtensionPage from "@/components/extension/DarkExtensionPage";

export const metadata: Metadata = {
  title: "Extension & Desktop Downloads — FocusFlow AI",
  description:
    "Download the FocusFlow Chrome Extension with Smart Focus Mode and the Windows Desktop companion application.",
};

export default function DownloadPage() {
  return (
    <main className="relative min-h-screen bg-transparent">
      <DarkExtensionPage />
    </main>
  );
}
