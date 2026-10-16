import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe — AI Chat Assistant",
  description: "A real-time AI chat assistant with tone controls and conversation history.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
