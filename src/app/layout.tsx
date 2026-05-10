import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DarkSon",
  description: "yo",
  icons: {
    icon: "https://ext.same-assets.com/1670718675/1131865299.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
