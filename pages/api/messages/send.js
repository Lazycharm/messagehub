// pages/api/messages/send.js
import { supabase } from '../../../lib/supabaseClient';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

/**
 * POST: Send outbound SMS via Twilio
 * Required fields:
 * - chatroom_id: ID of the chatroom to send from
 * - to_number: Recipient's phone number
 * - content: Message content
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  try {
    const { chatroom_id, to_number, content } = req.body;

    // Validate required fields
    if (!chatroom_id || !to_number || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: chatroom_id, to_number, and content are required' 
      });
    }

    // Validate Twilio configuration
    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured');
      return res.status(500).json({ 
        error: 'SMS service not configured. Please add Twilio credentials to environment variables.' 
      });
    }

    // Fetch chatroom to get the twilio_number (from_number)
    const { data: chatroom, error: chatroomError } = await supabase
      .from('chatrooms')
      .select('id, twilio_number')
      .eq('id', chatroom_id)
      .single();

    if (chatroomError || !chatroom) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    const fromNumber = chatroom.twilio_number;

    if (!fromNumber) {
      return res.status(400).json({ 
        error: 'Chatroom does not have a Twilio number configured' 
      });
    }

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: content.trim(),
      from: fromNumber,
      to: to_number.trim()
    });

    // Store the sent message in the messages table
    const { data: storedMessage, error: insertError } = await supabase
      .from('messages')
      .insert([{
        from_number: fromNumber,
        to_number: to_number.trim(),
        content: content.trim(),
        type: 'sms',
        read: false,
        chatroom_id: chatroom_id,
        twilio_message_sid: message.sid,
        status: message.status
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Supabase error storing sent message:', insertError);
      // Don't fail the request since Twilio send was successful
      return res.status(200).json({ 
        success: true,
        message: 'SMS sent successfully but failed to store in database',
        twilio_sid: message.sid,
        error: insertError.message
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'SMS sent successfully',
      twilio_sid: message.sid,
      data: storedMessage
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Check if it's a Twilio error
    if (error.code) {
      return res.status(400).json({ 
        error: 'Twilio error',
        details: error.message,
        code: error.code
      });
    }

    return res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
    });
  }
}
