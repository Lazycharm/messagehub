import React, { useEffect, useState } from 'react';

export default function ChatRoomContacts({ chatRoomId, onSelectContact }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatRoomId) return;
    setLoading(true);
    fetch(`/api/contacts?chatRoomId=${chatRoomId}`)
      .then(res => res.json())
      .then(data => {
        setContacts(data);
        setLoading(false);
      });
  }, [chatRoomId]);

  if (!chatRoomId) return null;

  return (
    <div className="w-64 border-r h-full overflow-y-auto">
      <h2 className="text-lg font-bold p-4">Contacts</h2>
      {loading ? (
        <p className="px-4 text-gray-500">Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <p className="px-4 text-gray-400">No contacts in this room</p>
      ) : (
        <ul>
          {contacts.map(contact => (
            <li
              key={contact.id}
              onClick={() => onSelectContact(contact)}
              className="cursor-pointer px-4 py-2 hover:bg-gray-100 border-b"
            >
              <p className="font-medium">{contact.name}</p>
              <p className="text-xs text-gray-500">{contact.phone_number}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
