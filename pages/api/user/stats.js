import { supabaseAdmin } from '../../../lib/supabaseClient';
import { getUserFromRequest } from '../../../lib/authMiddleware';

/**
 * GET: Fetch user statistics for dashboard
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }

  try {
    // Authenticate user
    const { user, error: authError } = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: authError || 'Authentication required' 
      });
    }

    const userId = user.id;

    // Use supabaseAdmin to bypass RLS issues on server-side
    // Fetch messages sent by this user
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('[User Stats] Messages error:', messagesError);
    }

    // Fetch contacts for this user
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', userId);

    if (contactsError) {
      console.error('[User Stats] Contacts error:', contactsError);
    }

    // Fetch chatrooms assigned to this user
    const { data: userChatrooms, error: chatroomsError } = await supabaseAdmin
      .from('user_chatrooms')
      .select('chatroom_id, chatrooms(id, name)')
      .eq('user_id', userId);

    if (chatroomsError) {
      console.error('[User Stats] Chatrooms error:', chatroomsError);
    }

    // Fetch inbound messages for user's chatrooms
    const chatroomIds = userChatrooms?.map(uc => uc.chatroom_id) || [];
    let inboundMessages = [];
    
    if (chatroomIds.length > 0) {
      const { data: inbound, error: inboundError } = await supabaseAdmin
        .from('inbound_messages')
        .select('*')
        .in('chatroom_id', chatroomIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (inboundError) {
        console.error('[User Stats] Inbound messages error:', inboundError);
      } else {
        inboundMessages = inbound || [];
      }
    }

    // Calculate statistics
    const deliveredCount = messages?.filter(m => m.status === 'delivered').length || 0;
    const totalSent = messages?.length || 0;
    
    console.log('[User Stats] Debug:', {
      userId,
      totalMessages: totalSent,
      deliveredMessages: deliveredCount,
      sampleStatuses: messages?.slice(0, 5).map(m => ({ id: m.id, status: m.status }))
    });

    const stats = {
      messages: messages || [],
      contacts: contacts || [],
      chatrooms: userChatrooms || [],
      inboundMessages: inboundMessages,
      totalSent,
      totalDelivered: deliveredCount,
      totalContacts: contacts?.length || 0,
      totalChatrooms: userChatrooms?.length || 0,
      totalInbound: inboundMessages.length,
      deliveryRate: totalSent > 0
        ? ((deliveredCount / totalSent) * 100).toFixed(1)
        : 0
    };

    return res.status(200).json(stats);

  } catch (error) {
    console.error('[User Stats] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch user statistics',
      details: error.message 
    });
  }
}
