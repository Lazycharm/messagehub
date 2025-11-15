import { supabase } from '../../../lib/supabaseClient';
import { getUserFromRequest, getUserChatroomIds } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Require authentication
      const { user, error: authError } = await getUserFromRequest(req);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { limit = 500, status, type } = req.query;
      
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      // Filter by user permissions
      if (user.role !== 'admin') {
        const chatroomIds = await getUserChatroomIds(user.id, false);
        if (chatroomIds.length === 0) {
          // User has no chatroom access
          return res.status(200).json([]);
        }
        query = query.in('chatroom_id', chatroomIds);
      }

      if (status) {
        query = query.eq('status', status);
      }
      
      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
