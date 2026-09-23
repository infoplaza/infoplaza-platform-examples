import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infoplaza Platform Examples",
  description:
    "Example implementations for the Infoplaza Platform API built with Next.js.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
      // The script below adds `data-embedded` before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Marks the page as embedded when it runs inside an iframe, before
            the first paint, so what the `embedded:` variant hides never
            flashes. Reading `window.top` across origins can throw, and a
            page that cannot read it is framed. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(window.self!==window.top)document.documentElement.dataset.embedded=""}catch(e){document.documentElement.dataset.embedded=""}`,
          }}
        />
      </head>
      <body className="flex min-h-screen bg-cloud text-dark">
        <Sidebar />
        {/* The top padding is room for the fixed bar the sidebar puts there
            on a narrow screen; on a wide one there is no bar and no padding.
            `min-w-0` keeps a wide table or map inside the column instead of
            pushing the whole page sideways. */}
        <main className="min-w-0 flex-1 overflow-y-auto px-4 pt-20 pb-10 lg:px-10 lg:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
