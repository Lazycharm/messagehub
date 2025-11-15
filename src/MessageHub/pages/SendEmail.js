import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, Clock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function SendEmail() {
  const [recipient, setRecipient] = useState('');
  const [recipientType, setRecipientType] = useState('single');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list()
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list()
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => base44.entities.Template.filter({ type: 'email' })
  });

  const handleSend = async () => {
    if (!subject || !content) {
      setResult({ success: false, message: 'Please enter subject and content' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      let recipients = [];

      if (recipientType === 'single') {
        const contact = contacts.find(c => c.id === recipient);
        if (!contact || !contact.email) {
          throw new Error('Invalid contact or missing email');
        }
        recipients = [contact];
      } else if (recipientType === 'group') {
        const members = await base44.entities.GroupMember.filter({ group_id: selectedGroup });
        const memberContacts = await Promise.all(
          members.map(m => base44.entities.Contact.filter({ id: m.contact_id }))
        );
        recipients = memberContacts.flat().filter(c => c.email);
      }

      const status = scheduleDate ? 'scheduled' : 'sent';

      for (const contact of recipients) {
        // Send actual email using Base44's email integration
        if (!scheduleDate) {
          try {
            await base44.integrations.Core.SendEmail({
              to: contact.email,
              subject: subject,
              body: content
            });
          } catch (error) {
            console.error('Email send failed:', error);
          }
        }

        // Log message
        await base44.entities.Message.create({
          type: 'email',
          direction: 'outbound',
          contact_id: contact.id,
          contact_name: contact.name,
          email: contact.email,
          subject,
          content,
          status,
          scheduled_at: scheduleDate || null,
          sent_at: scheduleDate ? null : new Date().toISOString()
        });
      }

      setResult({
        success: true,
        message: `Successfully ${scheduleDate ? 'scheduled' : 'sent'} ${recipients.length} email(s)!`
      });

      setSubject('');
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
      setSubject(template.subject || '');
      setContent(template.content);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-purple-600" />
            Send Email Message
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
                    {contacts.filter(c => c.email).map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} - {contact.email}
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
            <Label>Schedule (Optional)</Label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>

          <div className="space-y-2">
            <Label>Message Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your email message here..."
              rows={10}
              className="resize-none"
            />
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !subject || !content || (recipientType === 'single' && !recipient) || (recipientType === 'group' && !selectedGroup)}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            {sending ? (
              'Sending...'
            ) : scheduleDate ? (
              <>
                <Clock className="w-5 h-5 mr-2" />
                Schedule Email
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Send Email Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}