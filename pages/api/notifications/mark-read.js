import { supabase, supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    // Mark notification as read
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .or(`target_user_id.eq.${user.id},target_role.eq.${user.role || 'user'}`);

    if (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark as read' });
    }

    return res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
