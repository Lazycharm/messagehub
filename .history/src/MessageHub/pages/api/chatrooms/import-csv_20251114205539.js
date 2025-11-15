// pages/api/chatrooms/import-csv.js
import formidable from 'formidable';
import fs from 'fs';
import { parse } from 'csv-parse';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file) {
      return res.status(400).json({ error: 'CSV file upload failed' });
    }

    const chatroomId = fields.chatroomId?.[0];
    if (!chatroomId) return res.status(400).json({ error: 'Missing chatroom ID' });

    const contacts = [];

    const parser = fs
      .createReadStream(files.file[0].filepath)
      .pipe(parse({ columns: true }));

    for await (const record of parser) {
      contacts.push({
        name: record.name,
        phone_number: record.phone_number,
        email: record.email || '',
      });
    }

    // Store into mock chatroom
    const chatroom = chatrooms.find((r) => r.id === chatroomId);
    if (!chatroom) return res.status(404).json({ error: 'Chatroom not found' });

    chatroom.contacts.push(...contacts);

    return res.status(200).json({ imported: contacts.length });
  });
}
