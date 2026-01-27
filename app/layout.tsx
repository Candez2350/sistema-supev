import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";

const font = Nunito_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SUPEV - Sistema Unificado",
  description: "Sistema de Gestão de Coordenações",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={font.className}>{children}</body>
    </html>
  );
}