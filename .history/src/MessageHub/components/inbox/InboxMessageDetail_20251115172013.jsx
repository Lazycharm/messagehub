import React, { useState } from 'react';
import { api } from '../../../../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Mail, Reply, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function InboxMessageDetail({ message, onClose }) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await fetch(`/api/messages/inbound/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inboundMessages']);
      onClose();
    }
  });

  const handleReply = async () => {
    if (!replyContent) return;

    setSending(true);
    try {
      // Store outbound message (actual sending would require email/SMS service integration)
      await api.messages.create({
        type: message.type,
        direction: 'outbound',
        ...(message.type === 'email' 
          ? { 
              email: message.from_address,
              subject: `Re: ${message.subject || 'Your message'}`,
            }
          : { phone_number: message.from_address }
        ),
        content: replyContent,
        status: 'pending',
        sent_at: new Date().toISOString()
      });

      // Mark as replied
      await fetch(`/api/messages/inbound/${message.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replied: true })
      });

      alert('Reply queued successfully!');
      setReplyContent('');
      setShowReply(false);
      queryClient.invalidateQueries(['inboundMessages']);
      queryClient.invalidateQueries(['messages']);
    } catch (error) {
      alert('Failed to send reply: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this message?')) {
      deleteMutation.mutate(message.id);
    }
  };

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${message.type === 'sms' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                {message.type === 'sms' ? (
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Mail className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <CardTitle>{message.from_address}</CardTitle>
            </div>
            {message.subject && (
              <p className="text-sm text-gray-600 font-medium">{message.subject}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge className={message.type === 'sms' ? 'bg-blue-500' : 'bg-purple-500'}>
                {message.type.toUpperCase()}
              </Badge>
              {message.replied && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Replied
                </Badge>
              )}
              <span className="text-xs text-gray-500">
                {message.created_at && format(new Date(message.created_at), 'PPpp')}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>

        {!showReply ? (
          <Button onClick={() => setShowReply(true)} className="w-full bg-blue-600 hover:bg-blue-700">
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </Button>
        ) : (
          <div className="space-y-3 border-t pt-4">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReply}
                disabled={sending || !replyContent}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReply(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}