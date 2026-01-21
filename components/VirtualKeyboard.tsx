'use client';

import React, { useState } from 'react';
import './virtual-keyboard.css';

interface VirtualKeyboardProps {
  onChange: (input: string) => void;
  onKeyPress?: (button: string) => void;
  inputName?: string;
  layoutName?: string;
  value?: string;
  placeholder?: string;
  theme?: string;
  display?: Record<string, string>;
}

export default function VirtualKeyboard({
  onChange,
  onKeyPress,
  value = ""
}: VirtualKeyboardProps) {
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const defaultLayout = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "@", "."],
    ["⇧", "z", "x", "c", "v", "b", "n", "m", "_", "-", "✓"]
  ];

  const shiftLayout = [
    ["!", "\"", "#", "$", "%", "&", "'", "(", ")", "_", "⌫"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "@", "."],
    ["⇧", "Z", "X", "C", "V", "B", "N", "M", "+", "=", "✓"]
  ];

  const currentLayout = isShiftPressed ? shiftLayout : defaultLayout;

  const handleKeyPress = (key: string) => {
    if (onKeyPress) onKeyPress(key);

    const currentValue = value || "";

    if (key === "⌫") {
      // Effacement
      const newValue = currentValue.slice(0, -1);
      onChange(newValue);
      return;
    }

    if (key === "⇧") {
      // Shift
      setIsShiftPressed(!isShiftPressed);
      return;
    }

    if (key === "✓") {
      // Touche Entrée - Focus bouton d'envoi
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (submitButton) {
        submitButton.focus();
        submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Ajouter le caractère
    const newValue = currentValue + key;
    onChange(newValue);

    // Désactiver shift après une lettre (comportement normal)
    if (isShiftPressed && key !== "⇧") {
      setIsShiftPressed(false);
    }
  };

  const handleSpaceBar = () => {
    const currentValue = value || "";
    const newValue = currentValue + " ";
    onChange(newValue);
  };

  return (
    <div className="custom-virtual-keyboard">
      <style jsx>{`
        .custom-virtual-keyboard {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 18px;
          margin-top: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          user-select: none;
          width: 100%;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .keyboard-row {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        
        .keyboard-key {
          background: rgba(255, 255, 255, 0.95);
          border: none;
          border-radius: 8px;
          color: #2d3748;
          font-weight: 600;
          font-size: 22px;
          height: 65px;
          min-width: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          padding: 0 12px;
        }
        
        .keyboard-key:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .keyboard-key:active {
          transform: translateY(0);
          background: rgba(242, 242, 242, 1);
        }
        
        .keyboard-key.backspace {
          background: linear-gradient(135deg, #ff6b6b, #ee5a52);
          color: white;
          min-width: 85px;
        }
        
        .keyboard-key.enter {
          background: linear-gradient(135deg, #51cf66, #40c057);
          color: white;
          font-size: 18px;
          min-width: 85px;
        }
        
        .keyboard-key.shift {
          background: linear-gradient(135deg, #4dabf7, #339af0);
          color: white;
          min-width: 85px;
        }
        
        .keyboard-key.shift.active {
          background: linear-gradient(135deg, #339af0, #228be6);
          box-shadow: 0 0 10px rgba(52, 144, 220, 0.5);
        }
        
        .spacebar {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          display: block;
          height: 55px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 8px;
          font-size: 18px;
          color: #2d3748;
          cursor: pointer;
          margin-top: 12px;
        }
        
        .spacebar:hover {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
          .keyboard-key {
            height: 55px;
            min-width: 50px;
            font-size: 18px;
            gap: 4px;
          }
          
          .custom-virtual-keyboard {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            border-radius: 16px 16px 0 0;
            z-index: 1000;
            max-height: 50vh;
            overflow-y: auto;
            padding: 16px;
            max-width: 100%;
          }
          
          .spacebar {
            max-width: 350px;
            height: 50px;
            font-size: 16px;
          }

          .keyboard-key.backspace,
          .keyboard-key.enter,
          .keyboard-key.shift {
            min-width: 70px;
          }
        }
      `}</style>
      
      {currentLayout.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.map((key) => {
            let className = "keyboard-key";
            if (key === "⌫") className += " backspace";
            if (key === "✓") className += " enter";
            if (key === "⇧") className += ` shift ${isShiftPressed ? 'active' : ''}`;
            
            return (
              <button
                key={key}
                type="button"
                className={className}
                onClick={() => handleKeyPress(key)}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
      
      <button
        type="button"
        className="spacebar"
        onClick={handleSpaceBar}
      >
        espace
      </button>
    </div>
  );
}