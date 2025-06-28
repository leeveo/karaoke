'use client';

import React, { useEffect, useState } from 'react';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import CategorySelector from '@/components/CategorySelector';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      if (id) {
        try {
          const eventData = await fetchEventById(id);

          if (!eventData) {
            setError('Cet événement n\'existe pas.');
            setLoading(false);
            return;
          }

          if (!eventData.is_active) {
            setError('Cet événement n\'est pas disponible.');
            setLoading(false);
            return;
          }

          // Détermination de l'URL de background_image (S3)
          let bgUrl = '';
          if (
            eventData.customization &&
            eventData.customization.background_image
          ) {
            const bg = eventData.customization.background_image;
            bgUrl = bg.startsWith('http')
              ? bg
              : `https://leeveostockage.s3.eu-west-3.amazonaws.com/karaoke_users/${bg}`;
          }
          setBackgroundUrl(bgUrl || null);

          setEvent(eventData);
          setLoading(false);
        } catch (err) {
          console.error("Erreur lors du chargement de l'événement:", err);
          setError('Cet événement n\'existe pas ou n\'est plus disponible.');
          setLoading(false);
        }
      }
    }

    loadEvent();
  }, [id]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : undefined,
          backgroundColor: "#000",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="spinner"></div>
        <p className="ml-3 text-white">Chargement de l&apos;événement...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen text-white"
        style={{
          backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : undefined,
          backgroundColor: "#000",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <h1 className="text-3xl font-bold mb-4">Événement introuvable</h1>
        <p>{error || 'Cet événement n&apos;est pas disponible.'}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 px-6 py-3 bg-white text-purple-800 rounded-lg font-medium"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center relative overflow-hidden"
      style={{
        // Utilise backgroundImage uniquement si backgroundUrl existe, sinon ne mets rien
        ...(backgroundUrl
          ? {
              backgroundImage: `url('${backgroundUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundColor: undefined,
            }
          : {})
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-sm"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center w-full">
        {/* Event header with logo */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 w-full">
          <h1 className="text-4xl font-bold text-white mb-4 md:mb-0"
            style={{ WebkitTextStroke: "1px rgba(0,0,0,0.3)" }}
          >
            {event.name}
          </h1>

          {/* Display the logo if available */}
          {event.customization?.logo && (
            <div className="w-64 h-64 bg-white/10 backdrop-blur-md rounded-lg p-2 flex items-center justify-center">
              {/* Use Next.js Image for optimization */}
              <Image
                src={
                  event.customization.logo.startsWith('http')
                    ? event.customization.logo
                    : `https://leeveostockage.s3.eu-west-3.amazonaws.com/karaoke_users/${event.customization.logo}`
                }
                alt={`${event.name} Logo`}
                width={200}
                height={200}
                className="max-w-full max-h-full object-contain"
                style={{ display: 'block' }}
              />
            </div>
          )}
        </div>

        {/* Main content */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{
              color: 'var(--primary-color)',
              WebkitTextStroke: "2px rgba(255, 255, 255, 0.5)",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)"
            }}
          >
            Chante maintenant !
          </h2>
          <p
            className="text-xl max-w-xl mx-auto"
            style={{
              color: 'var(--secondary-color)',
              WebkitTextStroke: "1px rgba(255, 255, 255, 0.5)",
              textShadow: "0 1px 3px rgba(0,0,0,0.3)"
            }}
          >
            Choisis une catégorie de chansons et commence à chanter. Les vidéos seront enregistrées et partagées avec les participants.
          </p>
        </motion.div>

        {/* Catégories */}
        <div className="w-full max-w-4xl">
          <CategorySelector eventId={id} />
        </div>
      </div>
    </div>
  );
}
