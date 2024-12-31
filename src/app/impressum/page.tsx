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

import { Anchor, Box, Stack, Text, Title } from "@mantine/core";
import Footer from "../_components/Footer";
import Link from "next/link";
import { api } from "~/trpc/server";

export default async function Impressum() {
  const impress = await api.impress.get();

  return (
    <>
      <Stack align="start" m="xl">
        <Title>Impressum</Title>
        <Text>Angaben gemäß § 5 DDG</Text>
        <Box>
          <Text>{impress.name}</Text>
          {impress.address?.split(/\n|\\n/).map((line, index) => (
            <Text key={"address" + index}>{line}</Text>
          ))}
        </Box>
        <Box>
          <Title order={3}>Vertreten durch</Title>
          <Text>{impress.name}</Text>
        </Box>
        <Box>
          <Title order={3}>Kontakt</Title>
          E-Mail: <Anchor href={`mailto:${impress.email}`}>{impress.email}</Anchor>
        </Box>
        <Stack>
          <Title order={3}>Haftungsausschluss</Title>
          <Title order={4}>Haftung für Inhalte</Title>
          <Text>
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
            Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            Die Vorführungszeiten stammen von den Webseiten der Kinos (
            <Anchor component={Link} href="https://filmpalast.net">Filmpalast am ZKM</Anchor>,&nbsp;
            <Anchor component={Link} href="https://www.kinopolis.de/ka">Universum-City Karlsruhe</Anchor>,&nbsp;
            <Anchor component={Link} href="https://schauburg.de/">Filmtheater Schauburg</Anchor>,&nbsp;
            <Anchor component={Link} href="https://kinemathek-karlsruhe.de">Kinemathek Karlsruhe</Anchor>
            ). Weiterführende Informationen sowie Filmposter
            zu den Filmen stammen von <Anchor component={Link} href="https://www.themoviedb.org/">
              The Movie Database</Anchor> (TMDB). Alle diese Informationen werden automatisiert verarbeitet.
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten
            nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
            Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
            Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
            Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von
            Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche
            Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung
            möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte
            umgehend entfernen.</Text>
          <Title order={4}>Haftung für Links</Title>
          <Text>Unser Angebot kann Links zu externen Webseiten Dritter enthalten, auf deren Inhalte wir keinen
            Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
            Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
            verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
            Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht
            erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete
            Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen
            werden wir derartige Links umgehend entfernen.
          </Text>
        </Stack>
        <Stack>
          <Title order={3}>Datenschutzerklärung</Title>
          <Title order={4}>Allgemeines</Title>
          <Text>
            Diese Webseite erhebt und verarbeitet keine personenbezogenen Daten der Nutzer. Es werden keine Cookies
            gesetzt, kein Tracking durchgeführt und keine Analysedienste eingesetzt. Die Nutzung unserer Webseite
            ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene
            Daten (beispielsweise Name, Anschrift oder eMail-Adressen) erhoben werden, erfolgt dies, soweit möglich,
            stets auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte
            weitergegeben. Wir weisen darauf hin, dass die Datenübertragung im Internet (z.B. bei der Kommunikation
            per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz der Daten vor dem Zugriff durch Dritte
            ist nicht möglich.
            <br />
            Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten durch Dritte zur
            Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit
            ausdrücklich widersprochen. Die Betreiber der Seiten behalten sich ausdrücklich rechtliche Schritte
            im Falle der unverlangten Zusendung von Werbeinformationen, etwa durch Spam-Mails, vor.</Text>
          <Title order={4}>Datenquellen</Title>
          <Text>Für die Anzeige von Film-Postern und allgemeinen Informationen zu Filmen werden die Daten von TMDB
            (The Movie Database) verwendet. Die Nutzung dieser Daten unterliegt den&nbsp;
            <Anchor component={Link} href="https://www.themoviedb.org/documentation/api/terms-of-use">
              Nutzungsbedingungen und Datenschutzrichtlinien von TMDB
            </Anchor>.
            <br />
            Die Vorführungszeiten und Informationen der Kinos werden von den jeweiligen Kinos bereitgestellt.
            Dabei werden keine personenbezogenen Daten erhoben.
          </Text>
        </Stack>
      </Stack>
      <Footer />
    </>
  );
}
