import React, { useState } from 'react';
import { api } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../src/MessageHub/components/ui/card';
import { Button } from '../src/MessageHub/components/ui/button';
import { Textarea } from '../src/MessageHub/components/ui/textarea';
import { Label } from '../src/MessageHub/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../src/MessageHub/components/ui/select';
import { Input } from '../src/MessageHub/components/ui/input';
import { Alert, AlertDescription } from '../src/MessageHub/components/ui/alert';
import { MessageSquare, Send, Clock, Users, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/MessageHub/components/ui/tabs';

export default function SendSMS() {
  const [recipient, setRecipient] = useState('');
  const [recipientType, setRecipientType] = useState('single');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [content, setContent] = useState('');
  const [senderId, setSenderId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.contacts.list()
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.groups.list()
  });

  const { data: senderNumbers = [] } = useQuery({
    queryKey: ['senderNumbers'],
    queryFn: () => api.senderNumbers.list({ type: 'phone', active: true })
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['smsTemplates'],
    queryFn: () => api.templates.list('sms')
  });

  const handleSend = async () => {
    if (!content) {
      setResult({ success: false, message: 'Please enter message content' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      let recipients = [];

      if (recipientType === 'single') {
        const contact = contacts.find(c => c.id === recipient);
        if (!contact || !contact.phone_number) {
          throw new Error('Invalid contact or missing phone number');
        }
        recipients = [contact];
      } else if (recipientType === 'group') {
        const members = await base44.entities.GroupMember.filter({ group_id: selectedGroup });
        const memberContacts = await Promise.all(
          members.map(m => base44.entities.Contact.filter({ id: m.contact_id }))
        );
        recipients = memberContacts.flat().filter(c => c.phone_number);
      }

      const status = scheduleDate ? 'scheduled' : 'sent';
      const messages = recipients.map(contact => ({
        type: 'sms',
        direction: 'outbound',
        contact_id: contact.id,
        contact_name: contact.name,
        phone_number: contact.phone_number,
        content,
        sender_id: senderId,
        status,
        scheduled_at: scheduleDate || null,
        sent_at: scheduleDate ? null : new Date().toISOString(),
        region: contact.country_code
      }));

      await base44.entities.Message.bulkCreate(messages);

      // In production, this would trigger actual SMS sending via provider API
      // For now, we're just logging to database

      setResult({
        success: true,
        message: `Successfully ${scheduleDate ? 'scheduled' : 'sent'} ${messages.length} SMS message(s)!`
      });

      // Reset form
      setContent('');
      setRecipient('');
      setSelectedGroup('');
      setScheduleDate('');

      queryClient.invalidateQueries(['messages']);
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setContent(template.content);
    }
  };

  const charCount = content.length;
  const messageCount = Math.ceil(charCount / 160);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            Send SMS Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={recipientType} onValueChange={setRecipientType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Contact</TabsTrigger>
              <TabsTrigger value="group">Contact Group</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Contact</Label>
                <Select value={recipient} onValueChange={setRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.filter(c => c.phone_number).map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} - {contact.phone_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Group</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.contact_count || 0} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sender Number</Label>
              <Select value={senderId} onValueChange={setSenderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sender..." />
                </SelectTrigger>
                <SelectContent>
                  {senderNumbers.map(sender => (
                    <SelectItem key={sender.id} value={sender.id}>
                      {sender.label} - {sender.number_or_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Schedule (Optional)</Label>
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Use Template (Optional)</Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your SMS message here..."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{charCount} characters</span>
              <span>{messageCount} SMS part{messageCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !content || (recipientType === 'single' && !recipient) || (recipientType === 'group' && !selectedGroup)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {sending ? (
              'Sending...'
            ) : scheduleDate ? (
              <>
                <Clock className="w-5 h-5 mr-2" />
                Schedule SMS
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send SMS Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}