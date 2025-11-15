// Simple test page to view ChatRoomMessages component
import ChatRoomMessages from '../src/MessageHub/components/chatrooms/ChatRoomMessages';
import { useState } from 'react';

export default function TestPage() {
  // Use Support Team chatroom ID
  const [chatRoomId] = useState('ff42409a-747f-42d9-8b8a-40688e47e7be');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Real-Time Messaging Test</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <ChatRoomMessages chatRoomId={chatRoomId} />
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-900">
            <strong>Instructions:</strong><br/>
            1. Open browser console (F12)<br/>
            2. Run: <code className="bg-blue-100 px-2 py-1 rounded">.\test-realtime.ps1</code> in PowerShell<br/>
            3. Watch messages appear in real-time!
          </p>
        </div>
      </div>
    </div>
  );
}
