// pages/api/chatrooms/[id]/contacts.js
export default async function handler(req, res) {
  const {
    query: { id },
    method,
    body
  } = req;

  if (method === 'PATCH') {
    const { contactIds } = body;

    // Simulated DB fetch/update
    const chatroom = chatrooms.find((room) => room.id === id);
    if (!chatroom) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    chatroom.contacts.push(...contactIds);
    return res.status(200).json({ message: 'Contacts added', chatroom });
  }

  res.setHeader('Allow', ['PATCH']);
  res.status(405).end(`Method ${method} Not Allowed`);
}
