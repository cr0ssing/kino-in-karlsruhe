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
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "dayjs/locale/de";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { TRPCReactProvider } from "~/trpc/react";
import ClientLayout from "./clientLayout";

export const metadata: Metadata = {
  title: "Kino in Karlsruhe",
  description: "Ein Kalender zum Anzeigen aller Vorführungen von Kinos in Karlsruhe",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="en" className={`${GeistSans.variable}`} {...mantineHtmlProps}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Kino in Ka" />
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <TRPCReactProvider>
          <NuqsAdapter>
            <ClientLayout>
              {children}
            </ClientLayout>
          </NuqsAdapter>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
