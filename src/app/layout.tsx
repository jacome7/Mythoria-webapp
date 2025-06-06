import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mythoria - Your Adventure Awaits",
  description: "A powerful platform for creating and managing your mythical adventures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: { 
          colorPrimary: "#8B5A2B",
          colorBackground: "#F7F2E6",
          colorInputBackground: "#F0E8D8",
          colorInputText: "#1F2937",
        },
        elements: {
          formButtonPrimary:
            "bg-primary text-primary-content hover:bg-primary-focus border-primary",
          socialButtonsBlockButton:
            "bg-base-100 border-base-300 hover:bg-base-200 text-base-content",
          socialButtonsBlockButtonText: "font-semibold",
          formButtonReset:
            "bg-base-100 border-base-300 hover:bg-base-200 text-base-content",
          card: "bg-base-100",
          headerTitle: "text-base-content",
          headerSubtitle: "text-base-content/70",
          socialButtonsBlockButtonArrow: "text-base-content",
          formFieldLabel: "text-base-content",
          formFieldInput: "bg-base-200 border-base-300 text-base-content",
          footerActionText: "text-base-content/70",
          footerActionLink: "text-primary hover:text-primary-focus",
        },
      }}
    >
      <html lang="en" data-theme="autumn">
        <body className="min-h-screen flex flex-col antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
