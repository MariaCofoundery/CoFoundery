import { TeamraumScreen, type TeamraumQuery } from "@/features/advisor/TeamraumScreen";

export default function TeamraumSocialPage({ searchParams }: { searchParams?: Promise<TeamraumQuery> }) {
  return <TeamraumScreen section="social" searchParams={searchParams} />;
}
