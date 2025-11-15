import { supabase } from '../../../lib/supabaseClient';
import { requireAdmin } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end('Method not allowed');
  }

  try {
    // Require admin role
    const authResult = await requireAdmin(req, res);
    if (!authResult.user) {
      return; // Response already sent by requireAdmin
    }

    const { user_id, balance } = req.body;

    if (!user_id || balance === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id and balance' 
      });
    }

    if (typeof balance !== 'number' || balance < 0) {
      return res.status(400).json({ 
        error: 'Invalid balance. Must be a non-negative number' 
      });
    }

    // Update token balance
    const { data, error } = await supabase
      .from('user_tokens')
      .update({ balance })
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      // If record doesn't exist, create it
      if (error.code === 'PGRST116') {
        const { data: newData, error: createError } = await supabase
          .from('user_tokens')
          .insert([{ user_id, balance }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating token record:', createError);
          return res.status(500).json({ error: createError.message });
        }

        return res.status(200).json(newData);
      }

      console.error('Error updating tokens:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Update tokens handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
