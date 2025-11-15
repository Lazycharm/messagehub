import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { chatroom_id } = req.query;
      
      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (chatroom_id) {
        query = query.eq('chatroom_id', chatroom_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, phone_number, email, tags, chatroom_id } = req.body;
      
      // Check for duplicate phone number in same chatroom
      if (phone_number && chatroom_id) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone_number', phone_number)
          .eq('chatroom_id', chatroom_id)
          .single();
        
        if (existing) {
          return res.status(409).json({ error: 'Contact with this phone number already exists in this chatroom' });
        }
      }
      
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ name, phone_number, email, tags, chatroom_id }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error creating contact:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
