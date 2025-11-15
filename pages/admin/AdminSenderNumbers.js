import React, { useState } from 'react';
import { base44 } from '../../src/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../src/MessageHub/components/ui/button';
import { Card, CardContent } from '../../src/MessageHub/components/ui/card';
import { Badge } from '../../src/MessageHub/components/ui/badge';
import { Plus, Phone, Mail, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../src/MessageHub/components/ui/table';
import SenderNumberForm from '../../src/MessageHub/components/admin/SenderNumberForm';

export default function AdminSenderNumbers() {
  const [showForm, setShowForm] = useState(false);
  const [editingNumber, setEditingNumber] = useState(null);
  const queryClient = useQueryClient();

  const { data: senderNumbers = [], isLoading } = useQuery({
    queryKey: ['senderNumbers'],
    queryFn: () => base44.entities.SenderNumber.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SenderNumber.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['senderNumbers']);
      setShowForm(false);
      setEditingNumber(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SenderNumber.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['senderNumbers']);
      setShowForm(false);
      setEditingNumber(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SenderNumber.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['senderNumbers'])
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.SenderNumber.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries(['senderNumbers'])
  });

  const handleSubmit = (data) => {
    if (editingNumber) {
      updateMutation.mutate({ id: editingNumber.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (number) => {
    setEditingNumber(number);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this sender number?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id, currentActive) => {
    toggleActiveMutation.mutate({ id, active: !currentActive });
  };

  const getTypeIcon = (type) => {
    if (type === 'email') return <Mail className="w-4 h-4" />;
    return <Phone className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sender Numbers</h1>
          <p className="text-gray-500 mt-1">Manage phone numbers and sender IDs</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Sender Number
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Numbers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{senderNumbers.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {senderNumbers.filter(n => n.active).length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Messages</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {senderNumbers.reduce((sum, n) => sum + (n.message_count || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Label</TableHead>
                  <TableHead>Number/ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : senderNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No sender numbers configured
                    </TableCell>
                  </TableRow>
                ) : (
                  senderNumbers.map((number) => (
                    <TableRow key={number.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{number.label}</TableCell>
                      <TableCell>{number.number_or_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getTypeIcon(number.type)}
                          {number.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{number.region || '-'}</TableCell>
                      <TableCell>{number.message_count || 0}</TableCell>
                      <TableCell>
                        <Badge className={number.active ? 'bg-green-500' : 'bg-gray-400'}>
                          {number.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(number.id, number.active)}
                          >
                            {number.active ? (
                              <ToggleRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(number)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(number.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <SenderNumberForm
          senderNumber={editingNumber}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingNumber(null);
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
