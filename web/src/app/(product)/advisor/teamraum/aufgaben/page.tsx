import { TeamraumScreen, type TeamraumQuery } from "@/features/advisor/TeamraumScreen";

export default function TeamraumTasksPage({ searchParams }: { searchParams?: Promise<TeamraumQuery> }) {
  return <TeamraumScreen section="tasks" searchParams={searchParams} />;
}
