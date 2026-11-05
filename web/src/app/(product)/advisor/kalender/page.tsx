import { CalendarScreen, type CalendarQuery } from "@/features/advisor/calendar/CalendarScreen";

/** Kalender der Organisation (Entwurf 05.11.2026): Programm-Termine, Posts, Aufgaben-Fristen und gemerkte Events. */
export default function AdvisorCalendarPage({ searchParams }: { searchParams?: Promise<CalendarQuery> }) {
  return <CalendarScreen searchParams={searchParams} />;
}
