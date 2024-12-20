import "~/styles/globals.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import '@mantine/carousel/styles.css';

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { MantineProvider, ColorSchemeScript, createTheme, DEFAULT_THEME, mergeMantineTheme, mantineHtmlProps } from "@mantine/core";
import { TRPCReactProvider } from "~/trpc/react";
import { breakpoints, colors } from "./theme";
export const metadata: Metadata = {
  title: "Kino in Karlsruhe",
  description: "Ein Kalender zum Anzeigen aller Vorführungen von Kinos in Karlsruhe",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const theme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({
    fontFamily: GeistSans.style.fontFamily,
    breakpoints,
    colors,
  })
);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <TRPCReactProvider>
          <MantineProvider theme={theme}>{children}</MantineProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
