import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOCK_POSTS } from "@/app/page";
import PostInteractions from "./PostInteractions";
import styles from "./page.module.css";

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  
  const isMock = id.length < 10;
  let post;
  let commentsData: any[] = [];
  
  const CATEGORY_MAP: Record<string, string> = {
    movie: "영화", book: "책", game: "게임", restaurant: "맛집", other: "기타"
  };

  if (isMock) {
    const mockPost = MOCK_POSTS.find(p => p.id === id);
    if (!mockPost) notFound();
    post = {
       id: mockPost.id,
       category: CATEGORY_MAP[mockPost.categoryId] || mockPost.categoryId,
       title: mockPost.title,
       content: mockPost.content,
       image_url: mockPost.imageUrl,
       created_at: mockPost.date,
       likes_count: mockPost.likes,
       author: {
           id: mockPost.author.id,
           display_name: mockPost.author.name,
           avatar_url: mockPost.author.avatar
       }
    };
    commentsData = [
      { id: "c1", content: "I completely agree! The cinematography was stunning.", created_at: "2024-03-22T10:00:00Z", user: { display_name: "User123" } },
      { id: "c2", content: "Really? I thought the pacing was a bit slow in the middle.", created_at: "2024-03-22T13:00:00Z", user: { display_name: "Reader99" } }
    ];
  } else {
    // Live Supabase fetch
    const { data: dbPost, error } = await supabase
      .from('posts')
      .select('*, author:profiles(id, display_name, avatar_url)')
      .eq('id', id)
      .single();

    if (error || !dbPost) {
      notFound();
    }
    
    post = {
       ...dbPost,
       category: CATEGORY_MAP[dbPost.category] || dbPost.category
    };

    const { data: dbComments } = await supabase
      .from('comments')
      .select('*, user:profiles(id, display_name, avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: false });
      
    if (dbComments) commentsData = dbComments;
  }

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backBtn}>← Back to list</Link>
      
      <article className={styles.post}>
        <header className={styles.header}>
          <div className={styles.meta}>
            <span className={styles.category}>{post.category}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.author}>{post.author?.display_name || post.author?.name || 'Anonymous'}</span>
            <span className={styles.dot}>•</span>
            <span className={styles.date}>{new Date(post.created_at).toISOString().split('T')[0]}</span>
          </div>
          <h1 className={styles.title}>{post.title}</h1>
        </header>

        {post.image_url && (
          <div style={{ marginBottom: '40px', borderRadius: '16px', overflow: 'hidden' }}>
            <img src={post.image_url} alt={post.title} style={{ width: '100%', height: 'auto', maxHeight: '500px', objectFit: 'cover' }} />
          </div>
        )}
        
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: post.content }} />

        <PostInteractions 
          postId={post.id} 
          initialLikes={post.likes_count || 0} 
          initialComments={commentsData} 
          user={user} 
        />
      </article>
    </div>
  );
}
