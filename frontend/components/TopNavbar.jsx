"use client";
import { useState } from 'react';

/**
 * TopNavbar component - transparent overlay for controls
 */
export default function TopNavbar({
  isConnected,
  roomId,
  selectedColor,
  onColorChange,
  onClearCanvas,
  onJoinRoom,
  onLeaveRoom,
  brushSize,
  onBrushSizeChange
}) {
  const [roomInput, setRoomInput] = useState('');
  const [copied, setCopied] = useState(false);

  const colors = [
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' },
  ];

  const handleJoinRoom = () => {
    if (roomInput.trim()) {
      onJoinRoom(roomInput.trim());
      setRoomInput('');
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-black/40 border-b border-gray-700/50">
      <div className="flex items-center justify-between gap-4 p-3">
        {/* Left: Title and Room Info */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-transparent bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text">
            Whiteboard
          </h1>

          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/50">
              <span className="text-green-400 text-sm font-medium">🟢 {roomId}</span>
              <button
                onClick={handleCopyRoomId}
                className="ml-2 text-green-300 hover:text-green-200 text-xs transition-colors"
                title="Copy room ID"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="Enter room ID..."
                className="px-3 py-1 text-sm bg-gray-700/80 text-white rounded-lg border border-gray-600/50 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomInput.trim()}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Join
              </button>
            </div>
          )}
        </div>

        {/* Center: Drawing Tools */}
        {isConnected && (
          <div className="flex items-center gap-3">
            {/* Color Picker */}
            <div className="flex gap-1 p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onColorChange(color.value)}
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                    selectedColor === color.value
                      ? 'border-white scale-110'
                      : 'border-gray-500'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <span className="text-xs text-gray-300">🖌️</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
                className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-300 w-4">{brushSize}</span>
            </div>
          </div>
        )}

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              <button
                onClick={onClearCanvas}
                className="px-3 py-1 text-sm bg-red-600/80 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                🗑️ Clear
              </button>
              <button
                onClick={onLeaveRoom}
                className="px-3 py-1 text-sm bg-gray-700/80 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Leave
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
