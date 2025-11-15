import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    try {
      const updates = req.body;
      
      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error updating setting:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting setting:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
