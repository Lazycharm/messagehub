import React, { useState } from 'react';
import { base44 } from '../../src/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../src/MessageHub/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../src/MessageHub/components/ui/table';
import { Badge } from '../../src/MessageHub/components/ui/badge';
import { Button } from '../../src/MessageHub/components/ui/button';
import { Shield, Users, Crown, Ban } from 'lucide-react';
import { Alert, AlertDescription } from '../../src/MessageHub/components/ui/alert';

export default function AdminUsers() {
  const [updating, setUpdating] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      await base44.entities.User.update(userId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setUpdating(null);
    }
  });

  const handleRoleChange = (userId, newRole) => {
    if (confirm(`Change user role to ${newRole}?`)) {
      setUpdating(userId);
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <Badge className="bg-purple-500"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
    }
    return <Badge variant="outline">User</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage users and permissions</p>
        </div>
      </div>

      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          Admin Panel: Only administrators can access this section. Users can be invited via the Dashboard.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Administrators</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Regular Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role !== 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.full_name?.charAt(0) || user.email?.charAt(0)}
                          </div>
                          <span className="font-medium">{user.full_name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {user.created_date && new Date(user.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, 'user')}
                            disabled={updating === user.id}
                          >
                            Remove Admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            disabled={updating === user.id}
                          >
                            Make Admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
