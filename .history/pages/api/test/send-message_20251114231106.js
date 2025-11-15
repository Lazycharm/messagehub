// Test API route to simulate inbound messages
// DELETE THIS FILE after testing is complete
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS for testing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chatroom_id, content } = req.body;

    if (!chatroom_id || !content) {
      return res.status(400).json({ 
        error: 'chatroom_id and content are required',
        example: {
          chatroom_id: 'uuid-here',
          content: 'Test message'
        }
      });
    }

    // Verify chatroom exists
    const { data: chatroom, error: chatroomError } = await supabaseAdmin
      .from('chatrooms')
      .select('id, name')
      .eq('id', chatroom_id)
      .single();

    if (chatroomError || !chatroom) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    // Insert test message
    const testMessage = {
      from_number: '+15559999999', // Test sender
      to_number: '+15551234567',   // Test recipient
      content: content,
      type: 'sms',
      read: false,
      chatroom_id: chatroom_id,
      direction: 'inbound'
    };

    const { data: insertedMessage, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert([testMessage])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ 
        error: 'Failed to insert message', 
        details: insertError.message 
      });
    }

    console.log('✅ Test message inserted:', insertedMessage);

    return res.status(200).json({
      success: true,
      message: 'Test message sent successfully',
      data: insertedMessage,
      chatroom: chatroom.name
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
