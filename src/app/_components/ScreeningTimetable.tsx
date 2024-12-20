import { Table, Paper, TableTr, TableTd, TableTh, TableThead, TableTbody } from '@mantine/core';
import type { Screening } from '@prisma/client';

interface ScreeningTimetableProps {
  screenings: Array<Screening & { movie: { title: string }, cinema: { name: string } }>;
}

export function ScreeningTimetable({ screenings }: ScreeningTimetableProps) {
  // Group screenings by weekday (convert Sunday from 0 to 6)
  const groupedByWeekday = screenings.reduce((acc, screening) => {
    const weekday = screening.startTime.getDay();
    const mondayBasedDay = weekday === 0 ? 6 : weekday - 1; // Convert to Monday-based index
    if (!acc[mondayBasedDay]) {
      acc[mondayBasedDay] = [];
    }
    acc[mondayBasedDay].push(screening);
    return acc;
  }, {} as Record<number, typeof screenings>);

  // Weekday headers (now starting with Monday)
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Paper shadow="xs" p="md">
      <Table>
        <TableThead>
          <TableTr>
            {weekdays.map((day) => (
              <TableTh key={day} style={{ width: `${100 / 7}%` }}>{day}</TableTh>
            ))}
          </TableTr>
        </TableThead>
        <TableTbody>
          <TableTr>
            {weekdays.map((_, index) => (
              <TableTd key={index} style={{ verticalAlign: 'top', width: `${100 / 7}%` }}>
                {groupedByWeekday[index]?.map((screening) => (
                  <div key={screening.id} style={{ marginBottom: '0.5rem' }}>
                    <div><strong>{screening.movie.title}</strong></div>
                    <div>{screening.cinema.name}</div>
                    <div>
                      {screening.startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </TableTd>
            ))}
          </TableTr>
        </TableTbody>
      </Table>
    </Paper>
  );
} 