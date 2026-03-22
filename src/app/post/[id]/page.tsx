import Link from "next/link";
import styles from "./page.module.css";

// This is a placeholder. In a real app, you would fetch data based on the ID.
export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backBtn}>← Back to list</Link>
      
      <article className={styles.post}>
        <header className={styles.header}>
          <div className={styles.meta}>
            <span className={styles.category}>Movie</span>
            <span className={styles.dot}>•</span>
            <span className={styles.author}>Admin1</span>
            <span className={styles.dot}>•</span>
            <span className={styles.date}>2024-03-22</span>
          </div>
          <h1 className={styles.title}>Mock Post Detail Record #{id}</h1>
        </header>
        
        <div className={styles.content}>
          <p>
            This is the detailed content for post {id}. Everything is set up nicely with the Noto Sans font and the black & white hierarchy!
          </p>
          <br/>
          <p>
            You can read all the insights about this review here. The spacing and typography is crucial to maintaining a premium feel.
          </p>
        </div>

        <div className={styles.evaluation}>
          <button className={`${styles.evalBtn} ${styles.likeBtn}`}>👍 Like (42)</button>
          <button className={`${styles.evalBtn} ${styles.dislikeBtn}`}>👎 Dislike (2)</button>
        </div>
      </article>

      <section id="comments" className={styles.commentsSection}>
        <h2 className={styles.commentsTitle}>Comments (12)</h2>
        
        {/* Placeholder for Auth-aware comment input */}
        <div className={styles.commentInputArea}>
          <div className={styles.loginPrompt}>
            <p>You must be <strong>logged in</strong> to write comments. Guest users can only Like/Dislike.</p>
            <button className={styles.loginActionBtn}>Login to Comment</button>
          </div>
          <textarea 
            className={styles.commentInput} 
            placeholder="Write your opinion..." 
            disabled 
          />
          <button className={styles.submitBtn} disabled>Submit</button>
        </div>

        <div className={styles.commentList}>
          <div className={styles.comment}>
            <div className={styles.commentMeta}>
              <span className={styles.commentAuthor}>User123</span>
              <span className={styles.commentDate}>2 hours ago</span>
            </div>
            <p className={styles.commentText}>I completely agree! The cinematography was stunning.</p>
          </div>
          <div className={styles.comment}>
            <div className={styles.commentMeta}>
              <span className={styles.commentAuthor}>Reader99</span>
              <span className={styles.commentDate}>5 hours ago</span>
            </div>
            <p className={styles.commentText}>Really? I thought the pacing was a bit slow in the middle.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
