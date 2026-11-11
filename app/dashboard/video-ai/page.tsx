import { getAgencyContext } from "@/lib/agency";
import { redirect } from "next/navigation";
import VideoAIStudio from "./video-ai-studio";
import "./video-ai.css";

export default async function VideoAIPage() {
  const { supabase, userId, organization } = await getAgencyContext();
  if (!userId || !organization) redirect("/sem-acesso");

  const { data, error } = await supabase
    .from("video_projects")
    .select("id,name,description,status,aspect_ratio,resolution,created_at,updated_at")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });

  return (
    <VideoAIStudio
      organizationId={organization.id}
      initialProjects={error ? [] : data ?? []}
    />
  );
}
