import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./tokens.css";
import "./landing.css";
import "./curiosity-lab.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-ui",
  weight: "100 900",
  display: "swap",
});
const editorial = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-editorial",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Animind AI — Big Ideas, Made Visible",
  description:
    "Ask the question. Play with the concept. Watch understanding click through verified interactive physics and adaptive visual explanations.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${editorial.variable}`}>
      <body>{children}</body>
    </html>
  );
}
