import React, { useState } from 'react';
import { api } from '../../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, UserPlus, Trash2 } from 'lucide-react';

export default function ManageGroupMembers({ group, onClose }) {
  const [selectedContact, setSelectedContact] = useState('');
  const queryClient = useQueryClient();

  const { data: groupData } = useQuery({
    queryKey: ['group', group.id],
    queryFn: () => api.groups.get(group.id)
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.contacts.list()
  });

  const members = groupData?.members || [];
  const memberContactIds = members.map(m => m.id);
  const memberContacts = members;
  const availableContacts = contacts.filter(c => !memberContactIds.includes(c.id));

  const addMutation = useMutation({
    mutationFn: (contactId) => api.groups.addMembers(group.id, [contactId]),
    onSuccess: () => {
      queryClient.invalidateQueries(['group', group.id]);
      queryClient.invalidateQueries(['groups']);
      setSelectedContact('');
    }
  });

  const removeMutation = useMutation({
    mutationFn: (contactId) => api.groups.removeMember(group.id, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries(['group', group.id]);
      queryClient.invalidateQueries(['groups']);
    }
  });

  const handleAdd = () => {
    if (selectedContact) {
      addMutation.mutate(selectedContact);
    }
  };

  const handleRemove = (contactId) => {
    if (confirm('Remove this contact from the group?')) {
      removeMutation.mutate(contactId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Group Members</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{group.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new member */}
          <div className="flex gap-3">
            <Select value={selectedContact} onValueChange={setSelectedContact}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a contact to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.map(contact => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.email && `(${contact.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAdd}
              disabled={!selectedContact || addMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Current members */}
          <div>
            <h3 className="font-semibold mb-3">
              Current Members ({memberContacts.length})
            </h3>
            <div className="space-y-2">
              {memberContacts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No members yet</p>
              ) : (
                memberContacts.map((contact) => {
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-500">
                          {contact.email || contact.phone_number || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{contact.status}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(contact.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}