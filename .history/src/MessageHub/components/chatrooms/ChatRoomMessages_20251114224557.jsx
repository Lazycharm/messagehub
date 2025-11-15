import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ChatRoomMessages({ chatRoomId }) {
  const [messages, setMessages] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!chatRoomId) {
      console.warn('⚠️ ChatRoomMessages: No chatRoomId provided');
      return;
    }

    console.log('🔄 ChatRoomMessages: Setting up for chatroom:', chatRoomId);

    const fetchMessages = async () => {
      console.log('📥 Fetching existing messages...');
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chatroom_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
      } else {
        console.log(`✅ Loaded ${data?.length || 0} existing messages`);
        setMessages(data || []);
      }
    };

    fetchMessages();

    // Set up real-time subscription
    console.log('🔌 Setting up real-time subscription...');
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
          console.log('🚀 Real-time message received:', payload.new);
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
          console.log('✅ Real-time subscription active!');
        }
      });

    return () => {
      console.log('🔌 Cleaning up subscription for chatroom:', chatRoomId);
      supabase.removeChannel(channel);
      setIsSubscribed(false);
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
