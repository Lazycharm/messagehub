// Base44 Client - API abstraction layer
export const base44 = {
  auth: {
    isAuthenticated: async () => {
      // For now, return true to bypass authentication
      // TODO: Integrate with Supabase auth
      return true;
    },
    redirectToLogin: (returnUrl) => {
      if (typeof window !== 'undefined') {
        window.location.href = returnUrl || '/Dashboard';
      }
    },
    getUser: async () => {
      return { id: '1', name: 'Admin User', email: 'admin@messagehub.space' };
    }
  },
  
  entities: {
    Contact: {
      list: async (params = {}) => {
        const query = params.chatroom_id ? `?chatroom_id=${params.chatroom_id}` : '';
        const res = await fetch(`/api/contacts${query}`);
        if (!res.ok) throw new Error('Failed to fetch contacts');
        return res.json();
      },
      create: async (data) => {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create contact');
        return res.json();
      },
      update: async (id, data) => {
        const res = await fetch(`/api/contacts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update contact');
        return res.json();
      },
      delete: async (id) => {
        const res = await fetch(`/api/contacts/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete contact');
        return res.json();
      }
    },
    
    Chatroom: {
      list: async () => {
        const res = await fetch('/api/chatrooms');
        if (!res.ok) throw new Error('Failed to fetch chatrooms');
        return res.json();
      },
      get: async (id) => {
        const res = await fetch(`/api/chatrooms/${id}`);
        if (!res.ok) throw new Error('Failed to fetch chatroom');
        return res.json();
      },
      create: async (data) => {
        const res = await fetch('/api/chatrooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create chatroom');
        return res.json();
      },
      update: async (id, data) => {
        const res = await fetch(`/api/chatrooms/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update chatroom');
        return res.json();
      },
      delete: async (id) => {
        const res = await fetch(`/api/chatrooms/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete chatroom');
        return res.json();
      },
      assignContacts: async (id, contacts) => {
        const res = await fetch(`/api/chatrooms/${id}/contacts`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts })
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
          body: formData
        });
        if (!res.ok) throw new Error('Failed to import CSV');
        return res.json();
      }
    },
    
    Message: {
      list: async (params = {}) => {
        const query = params.chatroom_id ? `?chatroom_id=${params.chatroom_id}` : '';
        const res = await fetch(`/api/messages${query}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        return res.json();
      },
      send: async (data) => {
        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to send message');
        }
        return res.json();
      }
    },
    
    InboundMessage: {
      list: async (params = {}) => {
        const query = params.chatroom_id ? `?chatroom_id=${params.chatroom_id}` : '';
        const res = await fetch(`/api/messages/inbound${query}`);
        if (!res.ok) throw new Error('Failed to fetch inbound messages');
        return res.json();
      }
    },
    
    Group: {
      list: async () => {
        const res = await fetch('/api/groups');
        if (!res.ok) throw new Error('Failed to fetch groups');
        return res.json();
      },
      create: async (data) => {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create group');
        return res.json();
      },
      update: async (id, data) => {
        const res = await fetch(`/api/groups/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update group');
        return res.json();
      },
      delete: async (id) => {
        const res = await fetch(`/api/groups/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete group');
        return res.json();
      }
    },
    
    Template: {
      list: async () => {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error('Failed to fetch templates');
        return res.json();
      },
      create: async (data) => {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to create template');
        return res.json();
      },
      update: async (id, data) => {
        const res = await fetch(`/api/templates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update template');
        return res.json();
      },
      delete: async (id) => {
        const res = await fetch(`/api/templates/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete template');
        return res.json();
      }
    }
  }
};
