import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghost AI",
  description:
    "Real-time collaborative system design workspace. Describe a system, shape it on a shared canvas, generate the spec.",
};

/**
 * Clerk's `dark` theme is the base; every color is then re-pointed at the
 * project's CSS custom properties from `globals.css` so Clerk's UI moves with
 * the palette instead of carrying its own. No hex values here on purpose —
 * see `context/ui-context.md` for the token table.
 */
const clerkAppearance = {
  theme: dark,
  variables: {
    colorBackground: "var(--bg-elevated)",
    colorForeground: "var(--text-primary)",
    colorMuted: "var(--bg-subtle)",
    colorMutedForeground: "var(--text-muted)",
    colorNeutral: "var(--text-primary)",
    colorPrimary: "var(--accent-primary)",
    colorPrimaryForeground: "var(--bg-base)",
    colorInput: "var(--bg-subtle)",
    colorInputForeground: "var(--text-primary)",
    colorBorder: "var(--border-default)",
    colorRing: "var(--accent-primary)",
    colorDanger: "var(--state-error)",
    colorSuccess: "var(--state-success)",
    colorWarning: "var(--state-warning)",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyMono: "var(--font-geist-mono)",
    borderRadius: "var(--radius)",
  },
};

/**
 * Root layout for every route. It establishes the three things the rest of the
 * app assumes are already in place: the Geist font variables referenced by the
 * `--font-*` tokens, the `dark` class that activates the `dark:` variants baked
 * into `components/ui/*`, and the `ClerkProvider` that themes Clerk's own UI
 * from the project's CSS custom properties.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
