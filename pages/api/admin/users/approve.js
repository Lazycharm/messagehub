import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { userId, approved = true } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update user approval status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update({
        is_approved: approved,
        approved_at: approved ? new Date().toISOString() : null
      })
      .eq('id', userId)
      .select()
      .single();

    if (userError) throw userError;

    // Update token approval status
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .update({
        is_approved: approved,
        is_active: approved
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (tokenError) {
      console.warn('Error updating token:', tokenError);
    }

    return res.status(200).json({
      user: userData,
      token: tokenData,
      message: approved ? 'User approved successfully' : 'User access denied'
    });
  } catch (error) {
    console.error('Error approving user:', error);
    return res.status(500).json({ error: error.message });
  }
}
