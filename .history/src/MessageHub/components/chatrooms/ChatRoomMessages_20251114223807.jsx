import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ChatRoomMessages({ chatRoomId }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!chatRoomId) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chatroom_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    };

    fetchMessages();

    // Realtime listener
    const channel = supabase
      .channel(`room-${chatRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chatroom_id=eq.${chatRoomId}`
        },
        (payload) => {
          console.log('🆕 New realtime message:', payload.new);
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId]);

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      {messages.map((msg) => (
        <div key={msg.id} className="p-2 border rounded">
          <p className="text-sm">{msg.content}</p>
          <p className="text-xs text-gray-500">{new Date(msg.created_at).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
