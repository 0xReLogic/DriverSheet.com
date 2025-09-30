import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Providers } from "@components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DriverSheet.com",
  description: "Forward Uber, Lyft, DoorDash earnings PDFs into a live Google Sheet in minutes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}> 
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
