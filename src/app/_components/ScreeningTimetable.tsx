import { Table, Paper, TableTr, TableTd, TableTh, TableThead, TableTbody } from '@mantine/core';
import type { Screening } from '@prisma/client';

interface ScreeningTimetableProps {
  screenings: Array<Screening & { movie: { title: string }, cinema: { name: string } }>;
}

export function ScreeningTimetable({ screenings }: ScreeningTimetableProps) {
  // Group screenings by date
  const groupedScreenings = screenings.reduce((acc, screening) => {
    const date = screening.startTime.toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(screening);
    return acc;
  }, {} as Record<string, typeof screenings>);

  return (
    <Paper shadow="xs" p="md">
      <Table>
        <TableThead>
          <TableTr>
            <TableTh>Date</TableTh>
            <TableTh>Movie</TableTh>
            <TableTh>Cinema</TableTh>
            <TableTh>Time</TableTh>
          </TableTr>
        </TableThead>
        <TableTbody>
          {Object.entries(groupedScreenings).map(([date, dayScreenings]) =>
            dayScreenings.map((screening) => (
              <TableTr key={screening.id}>
                <TableTd>{new Date(date).toLocaleDateString()}</TableTd>
                <TableTd>{screening.movie.title}</TableTd>
                <TableTd>{screening.cinema.name}</TableTd>
                <TableTd>
                  {screening.startTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableTd>
              </TableTr>
            ))
          )}
        </TableTbody>
      </Table>
    </Paper>
  );
} 