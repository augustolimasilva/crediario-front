import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from './providers/SessionProvider';
import { Toaster } from 'sonner';
import DashboardLayout from './components/DashboardLayout';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crediário - Sistema de Vendas",
  description: "Sistema de gerenciamento de vendas na casa das pessoas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            expand={false}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
