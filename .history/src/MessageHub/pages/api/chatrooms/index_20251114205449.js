// pages/api/chatrooms/index.js
let chatrooms = []; // Temporary store (replace with DB later)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, assignedNumber, createdBy } = req.body;
    if (!name || !assignedNumber) {
      return res.status(400).json({ error: 'Chatroom name and number required' });
    }

    const newRoom = {
      id: Date.now().toString(),
      name,
      assignedNumber,
      createdBy,
      contacts: [],
    };

    chatrooms.push(newRoom);
    return res.status(201).json(newRoom);
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
