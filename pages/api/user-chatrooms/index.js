import { supabase } from '../../../lib/supabaseClient';
import { requireAdmin } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  try {
    // Require admin role
    const authResult = await requireAdmin(req, res);
    if (!authResult.user) {
      return; // Response already sent by requireAdmin
    }

    // GET: List all user-chatroom assignments
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('user_chatrooms')
        .select(`
          user_id,
          chatroom_id,
          created_at,
          users (id, email, name, role),
          chatrooms (id, name, twilio_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user-chatroom assignments:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    }

    // POST: Assign user to chatroom
    if (req.method === 'POST') {
      const { user_id, chatroom_id } = req.body;

      if (!user_id || !chatroom_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: user_id and chatroom_id' 
        });
      }

      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('user_chatrooms')
        .select('*')
        .eq('user_id', user_id)
        .eq('chatroom_id', chatroom_id)
        .single();

      if (existing) {
        return res.status(409).json({ 
          error: 'User is already assigned to this chatroom' 
        });
      }

      // Create assignment
      const { data, error } = await supabase
        .from('user_chatrooms')
        .insert([{ user_id, chatroom_id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating assignment:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    }

    // DELETE: Remove user from chatroom
    if (req.method === 'DELETE') {
      const { user_id, chatroom_id } = req.body;

      if (!user_id || !chatroom_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: user_id and chatroom_id' 
        });
      }

      const { error } = await supabase
        .from('user_chatrooms')
        .delete()
        .eq('user_id', user_id)
        .eq('chatroom_id', chatroom_id);

      if (error) {
        console.error('Error removing assignment:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ message: 'Assignment removed successfully' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('User-chatrooms handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
