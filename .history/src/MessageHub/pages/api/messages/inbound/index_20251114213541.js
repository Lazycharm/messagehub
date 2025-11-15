// pages/api/messages/inbound/index.js
import { supabase } from '../../../../lib/supabaseClient';

/**
 * POST: Twilio webhook endpoint for inbound SMS messages
 * Validates the to_number against chatrooms.twilio_number
 * Stores message in inbound_messages table with matched chatroom_id
 * 
 * Expected Twilio payload (form-urlencoded):
 * - From: sender's phone number
 * - To: recipient's phone number (your Twilio number)
 * - Body: message content
 */
export default async function handler(req, res) {
  try {
    // POST: Twilio webhook for inbound messages
    if (req.method === 'POST') {
      const { From, To, Body } = req.body;

      // Validate required Twilio parameters
      if (!From || !To || !Body) {
        return res.status(400).json({ 
          error: 'Missing required fields: From, To, and Body are required' 
        });
      }

      // Sanitize inputs
      const fromNumber = From.trim();
      const toNumber = To.trim();
      const content = Body.trim();

      // Find chatroom by matching twilio_number
      const { data: chatrooms, error: chatroomError } = await supabase
        .from('chatrooms')
        .select('id, twilio_number')
        .eq('twilio_number', toNumber)
        .limit(1);

      if (chatroomError) {
        console.error('Supabase error finding chatroom:', chatroomError);
        return res.status(500).json({ error: 'Database error', details: chatroomError.message });
      }

      // Validate that the Twilio number belongs to a chatroom
      if (!chatrooms || chatrooms.length === 0) {
        console.warn(`No chatroom found for Twilio number: ${toNumber}`);
        return res.status(404).json({ 
          error: 'Chatroom not found for this Twilio number',
          to_number: toNumber
        });
      }

      const chatroomId = chatrooms[0].id;

      // Insert inbound message into database
      const { error: insertError } = await supabase
        .from('inbound_messages')
        .insert([{
          from_number: fromNumber,
          chatroom_id: chatroomId,
          content: content
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Supabase error inserting inbound message:', insertError);
        return res.status(500).json({ error: 'Failed to store message', details: insertError.message });
      }

      // Also store in the main messages table for unified inbox
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          from_number: fromNumber,
          to_number: toNumber,
          content: content,
          type: 'sms',
          read: false,
          chatroom_id: chatroomId
        }]);

      if (messageError) {
        console.error('Supabase error inserting into messages table:', messageError);
        // Don't fail the request since inbound_messages was successful
      }

      // Respond to Twilio with TwiML (empty response = 200 OK)
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      
    } else if (req.method === 'GET') {
      // GET: Fetch all inbound messages (for testing/admin purposes)
      const { data: messages, error } = await supabase
        .from('inbound_messages')
        .select('*, chatrooms(name, twilio_number)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching inbound messages:', error);
        return res.status(500).json({ error: 'Failed to fetch messages', details: error.message });
      }

      return res.status(200).json(messages || []);
      
    } else {
      // Method not allowed
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    console.error('Unexpected error in messages/inbound/index.js:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
