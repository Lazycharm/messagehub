// pages/api/messages/inbound/index.js
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Replace this mock with DB fetch logic
      const mockMessages = [
        {
          id: '1',
          from_address: '+1234567890',
          content: 'Hello!',
          type: 'sms',
          subject: '',
          read: false,
          created_date: new Date().toISOString(),
        },
        {
          id: '2',
          from_address: 'test@example.com',
          content: 'Welcome!',
          type: 'email',
          subject: 'Subject line here',
          read: true,
          created_date: new Date().toISOString(),
        }
      ];
      res.status(200).json(mockMessages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
