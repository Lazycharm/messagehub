import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

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

    console.log('[Notifications] Fetching for user:', user.id);

    // Get user's chatrooms using admin client
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from('user_chatrooms')
      .select('chatroom_id')
      .eq('user_id', user.id);

    if (assignError) {
      console.error('[Notifications] Error fetching assignments:', assignError);
    }

    console.log('[Notifications] User chatrooms:', assignments?.length || 0);

    if (!assignments || assignments.length === 0) {
      return res.status(200).json({ count: 0, notifications: [] });
    }

    const chatroomIds = assignments.map(a => a.chatroom_id);

    // Get messages from the last 24 hours that aren't from the user
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, chatroom_id, sender, body, created_at, direction')
      .in('chatroom_id', chatroomIds)
      .eq('direction', 'inbound') // Only inbound messages (from customers)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[Notifications] Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    console.log('[Notifications] Found messages:', messages?.length || 0);

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

    console.log('[Notifications] Returning', notifications.length, 'notifications');

    return res.status(200).json({
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
