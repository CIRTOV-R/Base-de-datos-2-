import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoMarket Vital | Sistema de gestion",
  description:
    "Sistema de gestion para supermercado ecologico con analitica SQL, MFA, biometria, SSO y control de acceso basado en roles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#f6f8f7] font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
