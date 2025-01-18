/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

import "~/styles/globals.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import '@mantine/carousel/styles.css';

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { MantineProvider, ColorSchemeScript, createTheme, DEFAULT_THEME, mergeMantineTheme, mantineHtmlProps } from "@mantine/core";
import PullToRefresh from 'pulltorefreshjs';

import { TRPCReactProvider } from "~/trpc/react";
import { breakpoints, colors } from "./theme";

export const metadata: Metadata = {
  title: "Kino in Karlsruhe",
  description: "Ein Kalender zum Anzeigen aller Vorführungen von Kinos in Karlsruhe",
};

const theme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({
    fontFamily: GeistSans.style.fontFamily,
    breakpoints,
    primaryColor: "red",
    colors,
  })
);

// https://stackoverflow.com/a/78773384
// if we're on iOS in standalone mode, add support for pull to refresh
//@ts-ignore typescript doesn't recognize the non-standard standalone property as it only exists on iOS
const isInWebAppiOS = (window.navigator.standalone === true);
if (isInWebAppiOS) {
  PullToRefresh.init({
    mainElement: 'body',
    onRefresh() {
      window.location.reload();
    }
  });
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`} {...mantineHtmlProps}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Kino in Ka" />
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
