import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members (
            id,
            contact_id,
            contacts (
              id,
              name,
              phone_number,
              email
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching group:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const updates = req.body;
      
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error updating group:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Delete group members first (cascade)
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id);

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting group:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
