// pages/api/chatrooms/import-csv.js
import formidable from 'formidable';
import fs from 'fs';
import { parse } from 'csv-parse';
import { supabase } from '../../../lib/supabaseClient';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST: Accept CSV file upload and bulk insert contacts into a chatroom
 * Expected CSV columns: name, phone_number, email (optional), tags (optional, comma-separated)
 * Required field: chatroomId in form data
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }

  try {
    const form = new formidable.IncomingForm();
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Formidable parse error:', err);
        return res.status(400).json({ error: 'File upload failed', details: err.message });
      }

      if (!files.file || !files.file[0]) {
        return res.status(400).json({ error: 'CSV file is required' });
      }

      // Extract chatroom ID from form fields
      const chatroomId = fields.chatroomId?.[0] || fields.chatroomId;
      
      if (!chatroomId) {
        return res.status(400).json({ error: 'chatroom_id is required' });
      }

      // Verify chatroom exists
      const { data: chatroom, error: chatroomError } = await supabase
        .from('chatrooms')
        .select('id')
        .eq('id', chatroomId)
        .single();

      if (chatroomError || !chatroom) {
        return res.status(404).json({ error: 'Chatroom not found' });
      }

      const contacts = [];
      const filePath = files.file[0].filepath;

      // Parse CSV file
      const parser = fs
        .createReadStream(filePath)
        .pipe(parse({ columns: true, skip_empty_lines: true }));

      for await (const record of parser) {
        // Validate required fields
        if (!record.name || !record.phone_number) {
          console.warn('Skipping row with missing name or phone_number:', record);
          continue;
        }

        // Parse tags if present (comma-separated string to array)
        let tags = [];
        if (record.tags && typeof record.tags === 'string') {
          tags = record.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }

        contacts.push({
          name: record.name.trim(),
          phone_number: record.phone_number.trim(),
          email: record.email ? record.email.trim() : null,
          tags: tags,
          chatroom_id: chatroomId
        });
      }

      // Clean up temp file
      fs.unlinkSync(filePath);

      if (contacts.length === 0) {
        return res.status(400).json({ error: 'No valid contacts found in CSV' });
      }

      // Bulk insert contacts into Supabase
      const { data: insertedContacts, error: insertError } = await supabase
        .from('contacts')
        .insert(contacts)
        .select();

      if (insertError) {
        console.error('Supabase error inserting contacts:', insertError);
        return res.status(500).json({ error: 'Failed to import contacts', details: insertError.message });
      }

      return res.status(200).json({ 
        message: 'Contacts imported successfully',
        imported: insertedContacts.length,
        contacts: insertedContacts
      });
    });

  } catch (error) {
    console.error('Unexpected error in import-csv.js:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
