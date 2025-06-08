import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="autumn">
      <head>
        <title>Mythoria - Your Adventure Awaits</title>
        <meta name="description" content="A powerful platform for creating and managing your mythical adventures." />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
