import type { Metadata } from "next";
import { Manrope, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans-var",
  weight: ["400", "500", "600", "700", "800"],
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-display-var",
  weight: ["500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-var",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Shogun Relatórios",
  description: "Plataforma de BI e gestão operacional - Grupo Shogun",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${manrope.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
