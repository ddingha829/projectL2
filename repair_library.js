const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tcsdhfkicbbxizurdfrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjc2RoZmtpY2JieGl6dXJkZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ5MjMsImV4cCI6MjA4OTc1MDkyM30.YFs0Sr7uoMZ4DDd_NQ0uXNjahDjW6bRlkOVjxonEw0M';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MGJmYzBhMGNkNGZjMzZjNTcyYWY2ODI3MzU0N2Y0MiIsIm5iZiI6MTc3NzgwNjU3MS4zNTgsInN1YiI6IjY5ZjcyY2ViOWNiMzc2MTI2MjkxNzQ5NyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.DiwTWzgHnEsX5mA-T7fQanB5A9LVAEOPvns4Nz08V-4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function repair() {
    console.log('--- Library Repair Started ---');
    
    // 1. Fetch broken movie reviews
    const { data: reviews, error } = await supabase
        .from('post_reviews')
        .select('id, subject, place_id, embed_url')
        .eq('category', 'movie')
        .ilike('embed_url', '%google.com/maps%');
    
    if (error) {
        console.error('Fetch error:', error);
        return;
    }
    
    console.log(`Found ${reviews.length} broken movie reviews.`);
    
    for (const review of reviews) {
        const tmdbId = review.place_id?.replace('movie-', '');
        if (!tmdbId || isNaN(tmdbId)) {
            console.log(`Skipping ${review.subject} (Invalid TMDB ID: ${review.place_id})`);
            continue;
        }
        
        console.log(`Repairing ${review.subject} (ID: ${tmdbId})...`);
        
        try {
            // 2. Fetch poster from TMDB
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=ko-KR`, {
                headers: { Authorization: `Bearer ${TMDB_ACCESS_TOKEN}` }
            });
            const movieData = await tmdbRes.json();
            
            if (movieData.poster_path) {
                const posterUrl = `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
                
                // 3. Update database
                const { error: updateError } = await supabase
                    .from('post_reviews')
                    .update({ embed_url: posterUrl })
                    .eq('id', review.id);
                
                if (updateError) {
                    console.error(`Failed to update ${review.subject}:`, updateError);
                } else {
                    console.log(`Successfully repaired ${review.subject}!`);
                }
            } else {
                console.log(`No poster found for ${review.subject}.`);
            }
        } catch (err) {
            console.error(`Error repairing ${review.subject}:`, err);
        }
    }
    
    console.log('--- Library Repair Finished ---');
}

repair();
