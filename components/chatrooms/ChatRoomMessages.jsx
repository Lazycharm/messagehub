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
      {/* Debug Status Bar */}
      <div className="bg-blue-50 border border-blue-200 p-2 rounded text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>
            Real-time: {isSubscribed ? '✅ Connected' : '❌ Disconnected'} | 
            Chatroom: {chatRoomId || 'None'} | 
            Messages: {messages.length}
          </span>
        </div>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No messages yet. Send a test message to see real-time updates!
        </div>
      ) : (
        messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`p-3 rounded-lg ${
              msg.direction === 'inbound' 
                ? 'bg-gray-100 text-gray-900' 
                : 'bg-blue-500 text-white ml-12'
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {msg.direction === 'inbound' ? msg.from_number : 'You'}
                </p>
                <p className="mt-1">{msg.content}</p>
              </div>
              <span className={`text-xs ${
                msg.direction === 'inbound' ? 'text-gray-500' : 'text-blue-100'
              }`}>
                {msg.read ? '✓✓' : '✓'}
              </span>
            </div>
            <small className={`block mt-1 text-xs ${
              msg.direction === 'inbound' ? 'text-gray-500' : 'text-blue-100'
            }`}>
              {new Date(msg.created_at).toLocaleTimeString()}
            </small>
          </div>
        ))
      )}
    </div>
  );
}
