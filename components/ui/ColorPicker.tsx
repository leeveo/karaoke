'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Standard color palette
  const colorPalette = [
    // Blues
    '#0334b9', '#1a73e8', '#4285f4', '#8ab4f8', '#0ea5e9',
    // Reds
    '#ea4335', '#f87171', '#ef4444', '#b91c1c', '#7f1d1d',
    // Greens
    '#34a853', '#10b981', '#22c55e', '#16a34a', '#15803d',
    // Yellows/Oranges
    '#fbbc04', '#f59e0b', '#f97316', '#ea580c', '#c2410c',
    // Purples/Pinks
    '#a142f4', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    // Grays
    '#202124', '#5f6368', '#9aa0a6', '#dadce0', '#f8f9fa',
  ];

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update color state when prop changes
  useEffect(() => {
    setCurrentColor(color);
  }, [color]);

  // Handle color input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCurrentColor(newColor);
    onChange(newColor);
  };

  // Handle color selection from palette
  const handleColorSelect = (newColor: string) => {
    setCurrentColor(newColor);
    onChange(newColor);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex items-center space-x-3">
        {/* Color preview button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-md shadow-md border border-gray-300 flex items-center justify-center overflow-hidden transition-transform hover:scale-110"
          style={{ backgroundColor: currentColor }}
          aria-label="Open color picker"
        >
          <span className="sr-only">Choisir une couleur</span>
        </button>
        
        {/* Color hex input */}
        <div className="flex-grow max-w-xs">
          <input
            type="text"
            value={currentColor}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="#000000"
          />
        </div>
        
        {/* Native color input (hidden visually but accessible) */}
        <div className="relative w-8 h-8 overflow-hidden">
          <input
            type="color"
            value={currentColor}
            onChange={handleInputChange}
            className="absolute opacity-0 w-8 h-8 cursor-pointer"
            aria-label="Select color"
          />
          <div className="w-8 h-8 rounded-md border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Color palette dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64">
          <div className="grid grid-cols-5 gap-2">
            {colorPalette.map((paletteColor) => (
              <button
                key={paletteColor}
                type="button"
                className={`w-10 h-10 rounded-md hover:scale-110 transition-transform ${
                  currentColor.toLowerCase() === paletteColor.toLowerCase() 
                    ? 'ring-2 ring-blue-500 ring-offset-2' 
                    : 'border border-gray-200'
                }`}
                style={{ backgroundColor: paletteColor }}
                onClick={() => handleColorSelect(paletteColor)}
                aria-label={`Select color: ${paletteColor}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
