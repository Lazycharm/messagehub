import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ChatRoomMessages({ chatRoomId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!chatRoomId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chatroom_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages-${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chatroom_id=eq.${chatRoomId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div key={msg.id} className="bg-gray-100 p-2 rounded">
          <p>{msg.content}</p>
          <small className="text-gray-500">{msg.sent_at || msg.created_at}</small>
        </div>
      ))}
    </div>
  );
}
