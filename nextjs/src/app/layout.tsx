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
    >
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
