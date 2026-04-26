"use server";

import { createClient } from "@/lib/supabase/server";

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      sender:profiles!sender_id(id, display_name, avatar_url),
      post:posts(id, title, image_url),
      comment:comments(id, content)
    `)
    .eq('receiver_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Fetch notifications error:', error);
    return [];
  }

  return data || [];
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Fetch unread count error:', error);
    return 0;
  }

  return count || 0;
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Mark as read error:', error);
    return { success: false, error };
  }

  return { success: true };
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { success: false };

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Mark all as read error:', error);
    return { success: false, error };
  }

  return { success: true };
}
