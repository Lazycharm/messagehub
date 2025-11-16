import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Coins, Plus, Minus, Save, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

export default function AdminTokens() {
  const [editingUserId, setEditingUserId] = useState(null);
  const [newBalance, setNewBalance] = useState('');
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['usersWithTokens'],
    queryFn: async () => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/tokens/list', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const updateTokenMutation = useMutation({
    mutationFn: async ({ user_id, balance }) => {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/tokens/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ user_id, balance }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update tokens');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['usersWithTokens']);
      setEditingUserId(null);
      setNewBalance('');
      setResult({ success: true, message: 'Token balance updated successfully!' });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ success: false, message: error.message });
      setTimeout(() => setResult(null), 5000);
    },
  });

  const handleSave = (userId, currentBalance) => {
    const balance = parseInt(newBalance, 10);
    if (isNaN(balance) || balance < 0) {
      setResult({ success: false, message: 'Invalid balance amount' });
      setTimeout(() => setResult(null), 3000);
      return;
    }
    updateTokenMutation.mutate({ user_id: userId, balance });
  };

  const handleAdjust = (userId, currentBalance, amount) => {
    const newBal = Math.max(0, currentBalance + amount);
    updateTokenMutation.mutate({ user_id: userId, balance: newBal });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Management</h1>
          <p className="text-gray-500 mt-1">Manage user credit balances</p>
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries(['usersWithTokens'])}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Tokens</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {users.reduce((sum, u) => sum + (u.token_balance || 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Average Balance</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.token_balance || 0), 0) / users.length) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            User Token Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Token Balance</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {editingUserId === user.id ? (
                          <Input
                            type="number"
                            value={newBalance}
                            onChange={(e) => setNewBalance(e.target.value)}
                            className="w-32"
                            placeholder="New balance"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                              <Coins className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-lg">
                              {user.token_balance || 0}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {editingUserId === user.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSave(user.id, user.token_balance)}
                                disabled={updateTokenMutation.isPending}
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingUserId(null);
                                  setNewBalance('');
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAdjust(user.id, user.token_balance, -10)}
                                disabled={updateTokenMutation.isPending}
                              >
                                <Minus className="w-4 h-4 mr-1" />
                                -10
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAdjust(user.id, user.token_balance, 10)}
                                disabled={updateTokenMutation.isPending}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                +10
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingUserId(user.id);
                                  setNewBalance(user.token_balance.toString());
                                }}
                              >
                                Edit
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

