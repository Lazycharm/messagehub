import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's chatrooms
    const { data: assignments } = await supabase
      .from('user_chatrooms')
      .select('chatroom_id')
      .eq('user_id', user.id);

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({ count: 0, notifications: [] });
    }

    const chatroomIds = assignments.map(a => a.chatroom_id);

    // Get unread messages count (messages where user hasn't replied or seen)
    // For simplicity, we'll get messages from the last 24 hours that aren't from the user
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, chatroom_id, sender, body, created_at')
      .in('chatroom_id', chatroomIds)
      .neq('user_id', user.id) // Not sent by the user
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    // Format notifications
    const notifications = (messages || []).map(msg => ({
      id: msg.id,
      chatroom_id: msg.chatroom_id,
      type: 'new_message',
      title: 'New Message',
      message: `From ${msg.sender}: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`,
      timestamp: msg.created_at,
      read: false
    }));

    return res.status(200).json({
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
