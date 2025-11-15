import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';

export default function ChatRoomSidebar({ selectedRoomId, onSelectRoom }) {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['chatrooms'],
    queryFn: () => base44.entities.ChatRoom.list()
  });

  return (
    <Card className="h-full shadow-lg w-64">
      <CardContent className="overflow-y-auto space-y-2 py-4">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading chatrooms...</p>
        ) : rooms.length === 0 ? (
          <p className="text-center text-gray-500">No chatrooms yet</p>
        ) : (
          rooms.map(room => (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`cursor-pointer p-2 rounded-md ${
                selectedRoomId === room.id ? 'bg-blue-100 font-bold' : 'hover:bg-gray-100'
              }`}
            >
              <p>{room.name}</p>
              <p className="text-xs text-gray-500">{room.twilio_number}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
