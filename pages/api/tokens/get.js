import { supabase } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: authError || 'Authentication required' 
      });
    }

    // Get token balance for current user
    const { data, error } = await supabase
      .from('user_tokens')
      .select('balance, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no token record exists, create one
      if (error.code === 'PGRST116') {
        const { data: newTokenData, error: createError } = await supabase
          .from('user_tokens')
          .insert([{ user_id: user.id, balance: 100 }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating token record:', createError);
          return res.status(500).json({ error: createError.message });
        }

        return res.status(200).json(newTokenData);
      }

      console.error('Error fetching tokens:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Get tokens handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

