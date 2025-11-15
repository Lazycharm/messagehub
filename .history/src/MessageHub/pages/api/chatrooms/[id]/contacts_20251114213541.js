// pages/api/chatrooms/[id]/contacts.js
import { supabase } from '../../../../lib/supabaseClient';

/**
 * PATCH: Assign a list of contacts to a specific chatroom
 * Accepts: chatroom_id (from URL param) and contacts array [{name, phone_number, email}]
 */
export default async function handler(req, res) {
  const {
    query: { id },
    method,
    body
  } = req;

  try {
    if (method === 'PATCH') {
      const { contacts } = body;

      // Validate chatroom_id (UUID format)
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Valid chatroom ID is required' });
      }

      // Validate contacts array
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'Contacts array is required and must not be empty' });
      }

      // Verify chatroom exists
      const { data: chatroom, error: chatroomError } = await supabase
        .from('chatrooms')
        .select('id')
        .eq('id', id)
        .single();

      if (chatroomError || !chatroom) {
        return res.status(404).json({ error: 'Chatroom not found' });
      }

      // Sanitize and prepare contacts for insertion
      const sanitizedContacts = contacts.map(contact => {
        if (!contact.name || !contact.phone_number) {
          throw new Error('Each contact must have name and phone_number');
        }

        return {
          name: contact.name.trim(),
          phone_number: contact.phone_number.trim(),
          email: contact.email ? contact.email.trim() : null,
          chatroom_id: id,
          tags: contact.tags || []
        };
      });

      // Bulk insert contacts
      const { data: insertedContacts, error: insertError } = await supabase
        .from('contacts')
        .insert(sanitizedContacts)
        .select();

      if (insertError) {
        console.error('Supabase error inserting contacts:', insertError);
        return res.status(500).json({ error: 'Failed to add contacts', details: insertError.message });
      }

      return res.status(200).json({ 
        message: 'Contacts added successfully', 
        count: insertedContacts.length,
        contacts: insertedContacts 
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${method} Not Allowed`);

  } catch (error) {
    console.error('Unexpected error in chatrooms/[id]/contacts.js:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
