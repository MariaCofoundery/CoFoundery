import { TeamraumScreen, type TeamraumQuery } from "@/features/advisor/TeamraumScreen";

export default function TeamraumPagesPage({ searchParams }: { searchParams?: Promise<TeamraumQuery> }) {
  return <TeamraumScreen section="pages" searchParams={searchParams} />;
}
