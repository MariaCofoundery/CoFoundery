import { TeamraumScreen, type TeamraumQuery } from "@/features/advisor/TeamraumScreen";

export default function TeamraumChatPage({ searchParams }: { searchParams?: Promise<TeamraumQuery> }) {
  return <TeamraumScreen section="chat" searchParams={searchParams} />;
}
