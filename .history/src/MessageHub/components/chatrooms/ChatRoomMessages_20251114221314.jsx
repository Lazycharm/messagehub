useEffect(() => {
  if (!chatroom) return;
  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chatroom_id', chatroom.id)
      .order('created_at', { ascending: true });
    if (!error) setMessages(data);
  };
  loadMessages();
}, [chatroom]);
