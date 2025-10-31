"use client";
import { useState } from 'react';

/**
 * RoomControls component for joining and leaving whiteboard rooms
 * @param {boolean} isConnected - Whether the user is connected to a room
 * @param {string} roomId - Current room ID
 * @param {Function} onJoinRoom - Callback when joining a room
 * @param {Function} onLeaveRoom - Callback when leaving a room
 */
export default function RoomControls({ isConnected, roomId, onJoinRoom, onLeaveRoom }) {
  const [inputRoomId, setInputRoomId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleJoinRoom = () => {
    if (inputRoomId.trim()) {
      onJoinRoom(inputRoomId.trim());
      setInputRoomId('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-4 p-4 bg-linear-to-r from-green-900/30 to-emerald-900/30 rounded-lg shadow-lg border border-green-700/50">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xl">🟢</span>
          <span className="text-white font-medium">Connected to Room:</span>
          <span className="text-green-300 font-bold text-lg">{roomId}</span>
        </div>
        <button
          onClick={handleCopyRoomId}
          className="ml-auto bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium"
          title="Copy room ID"
        >
          {copied ? '✓ Copied!' : '📋 Copy ID'}
        </button>
        <button
          onClick={onLeaveRoom}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200 font-medium"
        >
          Leave
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-linear-to-b from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-2">🎨 Join a Room</h2>
      <p className="text-gray-400 text-sm mb-4">Enter or share a room ID to start collaborating</p>
      <div className="flex gap-3">
        <input
          type="text"
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter room ID..."
          className="flex-1 border border-gray-600 bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 placeholder-gray-500"
        />
        <button
          onClick={handleJoinRoom}
          disabled={!inputRoomId.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg transition-colors duration-200 font-semibold"
        >
          Join Room
        </button>
      </div>
      <p className="text-gray-400 text-sm mt-2">
        Enter a room ID to collaborate with others in real-time
      </p>
    </div>
  );
}
