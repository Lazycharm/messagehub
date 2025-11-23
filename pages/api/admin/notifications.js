import { supabaseAdmin } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get all notifications
      const { data: notifications, error } = await supabaseAdmin
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      return res.status(200).json(notifications || []);
    }

    if (req.method === 'POST') {
      const { title, message, type, target_user_id, target_role } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }

      if (!target_user_id && !target_role) {
        return res.status(400).json({ error: 'Either target_user_id or target_role is required' });
      }

      const { data, error } = await supabaseAdmin
        .from('admin_notifications')
        .insert({
          title,
          message,
          type: type || 'info',
          target_user_id: target_user_id || null,
          target_role: target_role || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return res.status(500).json({ error: 'Failed to create notification' });
      }

      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Notification ID is required' });
      }

      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting notification:', error);
        return res.status(500).json({ error: 'Failed to delete notification' });
      }

      return res.status(200).json({ message: 'Notification deleted' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Admin notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
