import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Inbox as InboxIcon, Mail, MessageSquare, Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import InboxMessageDetail from '../components/inbox/InboxMessageDetail';

export default function Inbox() {
  const [activeType, setActiveType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const queryClient = useQueryClient();

  const { data: inboundMessages = [], isLoading } = useQuery({
    queryKey: ['inboundMessages'],
    queryFn: () => base44.entities.InboundMessage.list('-created_date', 100)
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.InboundMessage.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries(['inboundMessages'])
  });

  const filteredMessages = inboundMessages
    .filter(m => activeType === 'all' || m.type === activeType)
    .filter(m =>
      m.from_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    if (!message.read) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const unreadCount = inboundMessages.filter(m => !m.read).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Message List */}
      <div className="lg:col-span-1 flex flex-col">
        <Card className="shadow-lg flex-1 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <InboxIcon className="w-5 h-5" />
                Inbox
                {unreadCount > 0 && (
                  <Badge className="bg-red-500">{unreadCount}</Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => queryClient.invalidateQueries(['inboundMessages'])}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={activeType} onValueChange={setActiveType} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="sms">SMS</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 px-4">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="p-4 bg-gray-100 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <InboxIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No messages found</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedMessage?.id === message.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : message.read
                      ? 'bg-gray-50 hover:bg-gray-100'
                      : 'bg-white border-2 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${message.type === 'sms' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {message.type === 'sms' ? (
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Mail className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm truncate ${!message.read ? 'font-bold' : 'font-medium'}`}>
                          {message.from_address}
                        </p>
                        {!message.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      {message.subject && (
                        <p className="text-xs text-gray-700 font-medium truncate mb-1">
                          {message.subject}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {message.content}
                      </p>
                      <p className="text-xs text-gray-400">
                        {message.created_date && format(new Date(message.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Detail */}
      <div className="lg:col-span-2">
        {selectedMessage ? (
          <InboxMessageDetail
            message={selectedMessage}
            onClose={() => setSelectedMessage(null)}
          />
        ) : (
          <Card className="shadow-lg h-full flex items-center justify-center">
            <CardContent className="text-center">
              <InboxIcon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a message to view details</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}