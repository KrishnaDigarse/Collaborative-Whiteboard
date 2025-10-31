"use client";
import { useState } from 'react';

/**
 * Toolbar component for selecting drawing colors and tools
 * @param {string} selectedColor - Currently selected color
 * @param {Function} onColorChange - Callback when color changes
 * @param {Function} onClearCanvas - Callback to clear the canvas
 */
export default function Toolbar({ selectedColor, onColorChange, onClearCanvas }) {
  const [brushSize, setBrushSize] = useState(2);

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

  return (
    <div className="flex flex-wrap items-center gap-6 p-4 bg-linear-to-r from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700">
      {/* Color Picker Section */}
      <div className="flex items-center gap-3">
        <span className="text-white font-semibold text-sm">🎨 Color:</span>
        <div className="flex gap-2 p-2 bg-gray-700 rounded-lg">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => onColorChange(color.value)}
              className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                selectedColor === color.value
                  ? 'border-white scale-110 shadow-lg shadow-current'
                  : 'border-gray-500 hover:border-gray-300'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Brush Size Section */}
      <div className="flex items-center gap-3">
        <span className="text-white font-semibold text-sm">🖌️ Size:</span>
        <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(brushSize / 20) * 100}%, #374151 ${(brushSize / 20) * 100}%, #374151 100%)`
            }}
          />
          <span className="text-gray-300 text-sm font-medium w-6 text-right">{brushSize}px</span>
        </div>
      </div>
      
      <div className="w-px h-8 bg-gray-600" />
      
      <button
        onClick={onClearCanvas}
        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors duration-200"
      >
        Clear Canvas
      </button>
    </div>
  );
}
