import { supabaseAdmin } from '../../../lib/supabaseClient';
import { verifyAuth } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin user
    const user = await verifyAuth(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available - check SUPABASE_SERVICE_ROLE_KEY');
      return res.status(500).json({ 
        error: 'Server configuration error',
        messages: [],
        users: [],
        chatrooms: [],
        senderNumbers: []
      });
    }

    // Fetch all data using admin client to bypass RLS
    const [messagesRes, usersRes, chatroomsRes, senderNumbersRes] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from('users')
        .select('*'),
      supabaseAdmin
        .from('chatrooms')
        .select('*'),
      supabaseAdmin
        .from('sender_numbers')
        .select('*')
    ]);

    // Return data even if some queries failed
    res.status(200).json({
      messages: messagesRes.error ? [] : (messagesRes.data || []),
      users: usersRes.error ? [] : (usersRes.data || []),
      chatrooms: chatroomsRes.error ? [] : (chatroomsRes.data || []),
      senderNumbers: senderNumbersRes.error ? [] : (senderNumbersRes.data || [])
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(200).json({ 
      error: error.message,
      messages: [],
      users: [],
      chatrooms: [],
      senderNumbers: []
    });
  }
}
