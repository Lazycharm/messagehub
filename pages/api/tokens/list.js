import { supabase } from '../../../lib/supabaseClient';
import { requireAdmin } from '../../../lib/authMiddleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  try {
    // Require admin role
    const authResult = await requireAdmin(req, res);
    if (!authResult.user) {
      return; // Response already sent by requireAdmin
    }

    // Fetch all users with their token balances
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        created_at,
        user_tokens (
          balance,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users with tokens:', error);
      return res.status(500).json({ error: error.message });
    }

    // Format the response
    const usersWithTokens = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      token_balance: user.user_tokens?.[0]?.balance || 0,
      tokens_updated_at: user.user_tokens?.[0]?.updated_at || null
    }));

    return res.status(200).json(usersWithTokens);
  } catch (error) {
    console.error('List tokens handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

