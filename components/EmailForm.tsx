'use client';

import React, { useState } from 'react';
import { sendEmail } from '@/lib/email';

interface Props {
  videoUrl: string;
}

export default function EmailForm({ videoUrl }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    await sendEmail(email, videoUrl);
    setSending(false);
    alert('Email envoyé avec succès ! 📧');
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <input
        type="email"
        placeholder="Ton email"
        className="border p-3 rounded w-80"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={handleSend}
        disabled={sending}
        className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:bg-gray-400"
      >
        {sending ? 'Envoi...' : 'Envoyer par email ✉️'}
      </button>
    </div>
  );
}

