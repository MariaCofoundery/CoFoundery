import { TeamraumScreen, type TeamraumQuery } from "@/features/advisor/TeamraumScreen";

export default function TeamraumWeekPage({ searchParams }: { searchParams?: Promise<TeamraumQuery> }) {
  return <TeamraumScreen section="week" searchParams={searchParams} />;
}
