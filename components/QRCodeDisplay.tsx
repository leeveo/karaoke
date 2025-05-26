'use client';

import { useQRCode } from 'next-qrcode';
import { useState, useEffect } from 'react';

interface Props {
  url: string;
  size?: number;
}

export default function QRCodeDisplay({ url, size = 256 }: Props) {
  const { Canvas } = useQRCode();
  const [primaryDarkColor, setPrimaryDarkColor] = useState('#000000'); // Default fallback color

  // Get the CSS variable value only on client side after component mounts
  useEffect(() => {
    const color =
      getComputedStyle(document.documentElement).getPropertyValue('--primary-dark').trim() || '#000000';
    setPrimaryDarkColor(color);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-6">
      <div
        className="p-4 rounded-lg relative"
        style={{
          boxShadow: '0 0 15px rgba(0,0,0,0.2)',
          background: 'white',
          border: '4px solid white',
        }}
      >
        {/* Decorative corner accents with theme colors */}
        <div
          className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl"
          style={{ borderColor: 'var(--primary-color)' }}
        ></div>
        <div
          className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr"
          style={{ borderColor: 'var(--secondary-color)' }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl"
          style={{ borderColor: 'var(--secondary-color)' }}
        ></div>
        <div
          className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br"
          style={{ borderColor: 'var(--primary-color)' }}
        ></div>

        {/* QR Code using theme colors */}
        <Canvas
          text={url}
          options={{
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 4,
            width: size,
            color: {
              dark: primaryDarkColor,
              light: '#FFFFFF',
            },
          }}
        />

        {/* Subtle logo in the center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--secondary-gradient)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="w-10 h-10"
            >
              <path d="M8 4a2.5 2.5 0 014.304-1.768A2.5 2.5 0 0116 4v10.5a6.5 6.5 0 01-13 0V8a4.5 4.5 0 019 0v8.5a2.5 2.5 0 01-5 0V8a1 1 0 012 0v8.5a.5.5 0 001 0V8a2.5 2.5 0 00-5 0v6.5a4.5 4.5 0 009 0V4a4.5 4.5 0 00-9 0v1a1 1 0 01-2 0V4z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
