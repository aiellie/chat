import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ChatShell } from "@/components/chat-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body className="h-svh overflow-hidden">
        <ThemeProvider>
          {/* The app around every page: a chat, or a page like Tools. */}
          <TooltipProvider>
            <ChatShell>{children}</ChatShell>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
