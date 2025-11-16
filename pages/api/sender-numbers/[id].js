import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const updates = { ...req.body };
      // Map active to is_active for database
      if ('active' in updates) {
        updates.is_active = updates.active;
        delete updates.active;
      }
      
      const { data, error } = await supabase
        .from('sender_numbers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      // Map is_active to active for frontend compatibility
      return res.status(200).json({ ...data, active: data.is_active });
    } catch (error) {
      console.error('Error updating sender number:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('sender_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting sender number:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
