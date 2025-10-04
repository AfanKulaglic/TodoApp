import Nav from "../components/Nav"
import React from "react"
import "./globals.css"

export const metadata = {
  title: "Todo",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bs">
      <body suppressHydrationWarning={true}>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}

