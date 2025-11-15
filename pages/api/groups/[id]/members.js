import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const { contact_ids } = req.body;
      
      if (!Array.isArray(contact_ids)) {
        return res.status(400).json({ error: 'contact_ids must be an array' });
      }

      const members = contact_ids.map(contact_id => ({
        group_id: id,
        contact_id
      }));

      const { data, error } = await supabase
        .from('group_members')
        .insert(members)
        .select();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error adding group members:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { contact_id } = req.body;
      
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('contact_id', contact_id);

      if (error) throw error;
      return res.status(204).end();
    } catch (error) {
      console.error('Error removing group member:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
