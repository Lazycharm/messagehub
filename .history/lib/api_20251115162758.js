// API Helper Functions - Direct calls to Next.js API routes
// NO BASE44 CLIENT - Direct Supabase + API routes only

export const api = {
  chatrooms: {
    list: async () => {
      const res = await fetch('/api/chatrooms');
      if (!res.ok) throw new Error('Failed to fetch chatrooms');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/chatrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create chatroom');
      return res.json();
    },
    
    assignContacts: async (chatroomId, contacts) => {
      const res = await fetch(`/api/chatrooms/${chatroomId}/contacts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts }),
      });
      if (!res.ok) throw new Error('Failed to assign contacts');
      return res.json();
    },
    
    importCSV: async (chatroomId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatroomId', chatroomId);
      
      const res = await fetch('/api/chatrooms/import-csv', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to import CSV');
      return res.json();
    },
  },
  
  messages: {
    send: async (data) => {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send message');
      }
      return res.json();
    },
    
    listInbound: async () => {
      const res = await fetch('/api/messages/inbound');
      if (!res.ok) throw new Error('Failed to fetch inbound messages');
      return res.json();
    },
  },
  
  // Admin API routes
  users: {
    list: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
  },
  
  settings: {
    list: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create setting');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/settings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      return res.json();
    },
    
    delete: async (id) => {
      const res = await fetch(`/api/settings/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete setting');
      return res.ok;
    },
  },
  
  auth: {
    me: async () => {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch current user');
      return res.json();
    },
    
    updateMe: async (data) => {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
  },
  
  allMessages: {
    list: async (limit = 500, filters = {}) => {
      const params = new URLSearchParams({ limit, ...filters });
      const res = await fetch(`/api/messages?${params}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
  },
  
  senderNumbers: {
    list: async () => {
      const res = await fetch('/api/sender-numbers');
      if (!res.ok) throw new Error('Failed to fetch sender numbers');
      return res.json();
    },
    
    create: async (data) => {
      const res = await fetch('/api/sender-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create sender number');
      return res.json();
    },
    
    update: async (id, data) => {
      const res = await fetch(`/api/sender-numbers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update sender number');
      return res.json();
    },
    
    delete: async (id) => {
      const res = await fetch(`/api/sender-numbers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete sender number');
      return res.ok;
    },
  },
};
