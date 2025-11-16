import { supabase } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { user, error } = await getUserFromRequest(req);

      if (!user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: error || 'Authentication required' 
        });
      }

      // Fetch token balance
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      return res.status(200).json({
        ...user,
        token_balance: tokenData?.balance || 0
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { user, error: authError } = await getUserFromRequest(req);

      if (!user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: authError || 'Authentication required' 
        });
      }

      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Update user profile
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: error.message });
      }

      // Fetch token balance
      const { data: tokenData } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      return res.status(200).json({
        ...updatedUser,
        token_balance: tokenData?.balance || 0
      });
    } catch (error) {
      console.error('Error updating current user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

