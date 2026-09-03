import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crônicas do Véu — RPG solo",
  description: "Uma aventura solo de fantasia com narrador de IA, ações livres e consequências.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
