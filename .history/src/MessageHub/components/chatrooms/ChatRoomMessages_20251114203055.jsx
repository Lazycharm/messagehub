import React, { useEffect, useState } from 'react';

export default function ChatRoomMessages({ chatRoomId, contact }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!chatRoomId || !contact) return;
    fetch(`/api/messages?chatRoomId=${chatRoomId}&contactPhone=${contact.phone_number}`)
      .then(res => res.json())
      .then(data => setMessages(data));
  }, [chatRoomId, contact]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatRoomId,
        to: contact.phone_number,
        content: newMessage,
      }),
    });
    const data = await res.json();
    setMessages(prev => [...prev, data]);
    setNewMessage('');
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-xs px-4 py-2 rounded-lg ${
              msg.direction === 'outbound'
                ? 'bg-blue-500 text-white self-end'
                : 'bg-gray-200 text-black self-start'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="p-4 border-t flex gap-2">
        <input
          className="border flex-1 rounded px-3 py-2"
          placeholder="Type your message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 py-2 rounded">
          Send
        </button>
      </div>
    </div>
  );
}
