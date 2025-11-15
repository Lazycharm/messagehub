// pages/api/chatrooms/index.js
import { supabase } from '../../../lib/supabaseClient';

/**
 * GET: Fetch all chatrooms ordered by created_at DESC
 * POST: Create a new chatroom with name and twilio_number
 */
export default async function handler(req, res) {
  try {
    // GET: Return all chatrooms
    if (req.method === 'GET') {
      const { data: chatrooms, error } = await supabase
        .from('chatrooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching chatrooms:', error);
        return res.status(500).json({ error: 'Failed to fetch chatrooms', details: error.message });
      }

      return res.status(200).json(chatrooms || []);
    }

    // POST: Create a new chatroom
    if (req.method === 'POST') {
      const { name, twilio_number } = req.body;

      // Validate required fields
      if (!name || !twilio_number) {
        return res.status(400).json({ error: 'Chatroom name and twilio_number are required' });
      }

      // Sanitize inputs
      const sanitizedName = name.trim();
      const sanitizedNumber = twilio_number.trim();

      if (sanitizedName.length === 0 || sanitizedNumber.length === 0) {
        return res.status(400).json({ error: 'Name and twilio_number cannot be empty' });
      }

      // Insert new chatroom into Supabase
      const { data: newChatroom, error } = await supabase
        .from('chatrooms')
        .insert([{ name: sanitizedName, twilio_number: sanitizedNumber }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating chatroom:', error);
        return res.status(500).json({ error: 'Failed to create chatroom', details: error.message });
      }

      return res.status(201).json(newChatroom);
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Unexpected error in chatrooms/index.js:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
