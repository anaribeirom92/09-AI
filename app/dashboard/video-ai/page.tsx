import { getAgencyContext } from "@/lib/agency";
import { redirect } from "next/navigation";
import VideoAIStudio from "./video-ai-studio";
import "./video-ai.css";

export default async function VideoAIPage() {
  const { userId, organization } = await getAgencyContext();
  if (!userId || !organization) redirect("/sem-acesso");
  return <VideoAIStudio />;
}
