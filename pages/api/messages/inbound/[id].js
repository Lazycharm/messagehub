// pages/api/messages/inbound/[id].js
export default async function handler(req, res) {
  const {
    query: { id },
    method,
    body,
  } = req;

  if (method === 'PATCH') {
    try {
      const { read } = body;

      // Replace with DB update logic
      console.log(`Marking message ${id} as read:`, read);

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update message' });
    }
  } else {
    res.setHeader('Allow', ['PATCH']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
