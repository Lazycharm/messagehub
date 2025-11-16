import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Generate new access token (8 characters)
    const newToken = generateAccessToken();

    // Check if token exists
    const { data: existing } = await supabase
      .from('user_tokens')
      .select('id')
      .eq('user_id', userId)
      .single();

    let data, error;

    if (existing) {
      // Update existing token
      ({ data, error } = await supabase
        .from('user_tokens')
        .update({
          access_token: newToken,
          assigned_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single());
    } else {
      // Create new token
      ({ data, error } = await supabase
        .from('user_tokens')
        .insert([{
          user_id: userId,
          access_token: newToken,
          is_approved: false,
          is_active: true
        }])
        .select()
        .single());
    }

    if (error) throw error;

    return res.status(200).json({
      token: data,
      message: 'Access token generated successfully'
    });
  } catch (error) {
    console.error('Error regenerating token:', error);
    return res.status(500).json({ error: error.message });
  }
}

function generateAccessToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
