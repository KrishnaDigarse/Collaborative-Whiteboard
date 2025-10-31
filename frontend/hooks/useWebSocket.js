import { useState, useCallback, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Custom hook for managing WebSocket connection to the whiteboard backend
 * @param {string} backendUrl - The backend WebSocket URL
 * @param {Function} onDrawEvent - Callback function to handle incoming draw events
 * @returns {Object} WebSocket state and control functions
 */
export function useWebSocket(backendUrl, onDrawEvent) {
  const [stompClient, setStompClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState('');

  const connectToRoom = useCallback((newRoomId) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(backendUrl),
      onConnect: () => {
        const subscription = client.subscribe(`/topic/board/${newRoomId}`, (message) => {
          const event = JSON.parse(message.body);
          onDrawEvent(event);
        });
        
        setIsConnected(true);
        setRoomId(newRoomId);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('WebSocket error:', frame);
      },
    });

    client.activate();
    setStompClient(client);
  }, [backendUrl, onDrawEvent]);

  const disconnectFromRoom = useCallback(() => {
    if (stompClient) {
      stompClient.deactivate();
      setStompClient(null);
    }
    setIsConnected(false);
    setRoomId('');
  }, [stompClient]);

  const sendDrawEvent = useCallback((drawEvent) => {
    if (stompClient && isConnected && roomId) {
      stompClient.publish({
        destination: `/app/draw/${roomId}`,
        body: JSON.stringify({
          ...drawEvent,
          roomId: roomId
        })
      });
    }
  }, [stompClient, isConnected, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  return {
    isConnected,
    roomId,
    connectToRoom,
    disconnectFromRoom,
    sendDrawEvent
  };
}
