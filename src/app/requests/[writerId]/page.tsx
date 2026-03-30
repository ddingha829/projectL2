import { AUTHORS } from "@/lib/constants/authors";
import RequestBoard from "./RequestBoard";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ writerId: string }>
}) {
  const resolvedParams = await params;
  const writerId = resolvedParams.writerId;
  
  // 1. Check static AUTHORS
  let author = AUTHORS.find(a => a.id === writerId);

  // 2. If not found in static, check Database Profiles
  if (!author) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, color, bio, description_bullets')
      .eq('id', writerId)
      .single();

    if (profile) {
      author = {
        id: profile.id,
        name: profile.display_name || "익명 작가",
        color: profile.color || "#0a467d",
        avatar: "", // Avatar not strictly needed for the request board header but could be added
        description: {
          bio: profile.bio || "",
          bullets: profile.description_bullets || []
        }
      };
    }
  }

  if (!author) {
    return notFound();
  }

  return (
    <RequestBoard 
      writerId={author.id} 
      writerName={author.name} 
      color={author.color} 
    />
  );
}
