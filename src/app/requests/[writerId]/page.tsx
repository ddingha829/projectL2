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
    
    // UUID 형식인지 확인
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(writerId);
    
    const query = supabase
      .from('profiles')
      .select('id, display_name, color, bio, bullets');
      
    if (isUuid) {
      query.eq('id', writerId);
    } else {
      query.eq('display_name', decodeURIComponent(writerId));
    }

    const { data: profile } = await query.single();

    if (profile) {
      author = {
        id: profile.id,
        name: profile.display_name || "익명 작가",
        color: profile.color || "#0a467d",
        avatar: "", 
        description: {
          bio: profile.bio || "",
          bullets: profile.bullets || []
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
          name: "신규 티끌러",
          color: "#0a467d",
          avatar: "",
          description: {
            bio: "현재 프로필을 준비 중인 티끌러입니다.",
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
