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
        avatar: "", 
        description: {
          bio: profile.bio || "",
          bullets: profile.description_bullets || []
        }
      };
    } else {
      // 3. Fallback: Check if they have written any posts (Validates writerId existence)
      const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('author_id', writerId)
        .limit(1)
        .single();
      
      if (post) {
        author = {
          id: writerId,
          name: "신규 에디터",
          color: "#0a467d",
          avatar: "",
          description: {
            bio: "현재 프로필을 준비 중인 에디터입니다.",
            bullets: ["신규 멤버"]
          }
        };
      }
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
