'use client';

import { useSearchParams, useParams, useRouter } from 'next/navigation';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { useEffect, useState } from 'react';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';

export default function EventQRPage() {
  const searchParams = useSearchParams();
  const { id, sessionId } = useParams();
  const [pageUrl, setPageUrl] = useState<string | null>(searchParams.get('pageUrl'));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const router = useRouter();
  
  // Charger l'événement et ses personnalisations
  useEffect(() => {
    async function loadEventAndBackground() {
      if (typeof id === 'string') {
        try {
          const eventData = await fetchEventById(id);
          setEvent(eventData);

          // Détermination stricte de l'URL de background_image (S3 ou URL complète)
          let bgUrl = '';
          if (
            eventData?.customization &&
            eventData.customization.background_image
          ) {
            const bg = eventData.customization.background_image;
            bgUrl = bg.startsWith('http')
              ? bg
              : `https://leeveostockage.s3.eu-west-3.amazonaws.com/karaoke_users/${bg}`;
          }
          setBackgroundUrl(bgUrl || null);

          // Appliquer les couleurs personnalisées
          if (eventData.customization) {
            document.documentElement.style.setProperty('--primary-color', eventData.customization.primary_color);
            document.documentElement.style.setProperty('--primary-light', adjustColorLightness(eventData.customization.primary_color, 20));
            document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(eventData.customization.primary_color, -20));
            document.documentElement.style.setProperty('--secondary-color', eventData.customization.secondary_color);
            document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(eventData.customization.secondary_color, 20));
            document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(eventData.customization.secondary_color, -20));
            
            // Configurer les gradients
            document.documentElement.style.setProperty(
              '--primary-gradient', 
              `linear-gradient(135deg, ${eventData.customization.primary_color} 0%, ${adjustColorLightness(eventData.customization.primary_color, 20)} 100%)`
            );
            document.documentElement.style.setProperty(
              '--secondary-gradient', 
              `linear-gradient(135deg, ${eventData.customization.secondary_color} 0%, ${adjustColorLightness(eventData.customization.secondary_color, 20)} 100%)`
            );
            
            // Charger l'image de fond
            if (eventData.customization.background_image) {
              try {
                // Construire l'URL complète à partir du nom du fichier stocké dans la base
                const publicUrlResult = supabase.storage
                  .from('karaokestorage')
                  .getPublicUrl(`backgrounds/${eventData.customization.background_image}`);
              
                if (publicUrlResult.data?.publicUrl) {
                  eventData.customization.backgroundImageUrl = publicUrlResult.data.publicUrl;
                  console.log("Image de fond chargée:", publicUrlResult.data.publicUrl);
                } else {
                  console.error("URL publique non disponible pour l'image:", eventData.customization.background_image);
                }
              } catch (error) {
                console.error("Erreur lors de la récupération de l'URL de l'image:", error);
              }
            }
          }
        } catch (err) {
          console.error('Erreur lors du chargement de l\'événement:', err);
        }
      }
    }
    
    loadEventAndBackground();
  }, [id]);

  // Fonction utilitaire pour ajuster la luminosité d'une couleur hex
  function adjustColorLightness(color: string, percent: number): string {
    try {
      // Convert hex to RGB
      let r = parseInt(color.substring(1,3), 16);
      let g = parseInt(color.substring(3,5), 16);
      let b = parseInt(color.substring(5,7), 16);

      // Adjust lightness
      r = Math.min(255, Math.max(0, r + (r * percent / 100)));
      g = Math.min(255, Math.max(0, g + (g * percent / 100)));
      b = Math.min(255, Math.max(0, b + (b * percent / 100)));

      // Convert back to hex
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    } catch {
      return color; // Return original color if any error occurs
    }
  }
  
  // Get URL from session storage if not in search params
  useEffect(() => {
    const getQrUrl = async () => {
      // If URL is from querystring, verify it works properly
      if (pageUrl) {
        try {
          // If it's an S3 URL, try to get a signed version
          if (pageUrl.includes('s3.amazonaws.com')) {
            console.log("Processing S3 URL");
            
            // Extract the key from the S3 URL
            const urlObj = new URL(pageUrl);
            const path = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
            
            // Try to get a fresh signed URL
            try {
              const newSignedUrl = await getSignedUrl(path);
              if (newSignedUrl) {
                console.log("Generated new signed URL");
                setPageUrl(newSignedUrl);
                sessionStorage.setItem('video-s3-url-signed', newSignedUrl);
                return;
              }
            } catch (signError) {
              console.warn("Could not generate new signed URL:", signError);
              // Continue with current URL
            }
          }
          
          // For non-S3 URLs or if signing failed, use direct URL but check access
          if (pageUrl.startsWith('http') && !pageUrl.startsWith('blob:')) {
            try {
              // Try to do a HEAD request to check if the URL is accessible
              await fetch(pageUrl, { 
                method: 'HEAD',
                mode: 'no-cors' // Use no-cors to avoid CORS issues with the check
              });
              console.log("URL appears accessible");
            } catch (corsError) {
              console.warn('CORS or network issue with URL:', corsError);
              setLoadError("Note: URL might have access restrictions outside this app");
            }
          }
          
          return;
        } catch (error) {
          console.error("Error processing URL:", error);
        }
      }
      
      // If no URL in params, try session storage with preference for signed URLs
      const storedSignedUrl = sessionStorage.getItem('video-s3-url-signed');
      const storedDirectUrl = sessionStorage.getItem('video-s3-url');
      const storedLocalUrl = sessionStorage.getItem('video-local-url');
      
      if (storedSignedUrl) {
        console.log("Using stored signed URL");
        setPageUrl(storedSignedUrl);
      } else if (storedDirectUrl) {
        console.log("Using stored direct URL");
        setPageUrl(storedDirectUrl);
        // Warning about potential access issues
        setLoadError("Note: This URL might have access restrictions. If sharing doesn't work, try re-uploading.");
      } else if (storedLocalUrl) {
        setPageUrl(storedLocalUrl);
        setLoadError("Note: Using local video URL. This link will only work on this device temporarily.");
      } else {
        // If we still don't have a URL, redirect to home after a delay
        const timer = setTimeout(() => {
          router.push(`/event/${id}`);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    };
    
    getQrUrl();
  }, [pageUrl, router, id]);

  // États
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Ma performance karaoké à partager',
    message: '',
    rgpdConsent: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Rediriger si l'URL n'est pas définie
    if (!pageUrl) {
      router.push(`/event/${id}`);
    }
    
    // Préremplir le message et le sujet avec le nom de l'événement si disponible
    if (pageUrl && event) {
      setFormData(prev => ({
        ...prev,
        subject: `Ma performance karaoké à ${event.name}`,
        message: `Salut !\n\nJe viens de faire une performance karaoké à l'événement "${event.name}" que j'aimerais partager avec toi.\n\nClique sur le bouton ci-dessous pour la regarder !`
      }));
    } else if (pageUrl) {
      setFormData(prev => ({
        ...prev,
        subject: 'Ma performance karaoké à partager',
        message: `Salut !\n\nJe viens de faire une performance karaoké que j'aimerais partager avec toi.\n\nClique sur le bouton ci-dessous pour la regarder !`
      }));
    }
  }, [pageUrl, router, id, event]);

  // Gérer le changement des champs du formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Fonction pour envoyer l'email via notre API
  const sendEmail = async () => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          videoUrl: pageUrl,
          sessionId: sessionId,
          eventId: id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'envoi de l\'email');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur d\'envoi d\'email:', error);
      throw error;
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async () => {
    // e.preventDefault(); // Remove unused parameter and call
    event?.preventDefault?.(); // Defensive: in case event is passed by mistake

    // Validation des champs
    if (!formData.name.trim()) {
      setFormError('Le nom est requis');
      return;
    }
    
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setFormError('Email invalide');
      return;
    }
    
    if (!formData.rgpdConsent) {
      setFormError('Vous devez accepter les conditions RGPD');
      return;
    }
    
    setFormError('');
    setIsSubmitting(true);
    
    try {
      // Envoyer l'email via notre API
      await sendEmail();
      
      // Marquer comme envoyé
      setEmailSent(true);
      
      // Copier le lien dans le presse-papiers
      await navigator.clipboard.writeText(pageUrl as string);
      
      // Afficher un message de succès
      alert('Email envoyé avec succès et lien copié dans le presse-papiers!');
      
      // Fermer le formulaire
      setShowForm(false);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du formulaire:', error);
      setFormError('Erreur lors de l&apos;envoi de l&apos;email, veuillez réessayer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir le popup de formulaire au lieu de partager directement
  const handleShareButtonClick = () => {
    setShowForm(true);
  };

  if (!pageUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{
          ...(backgroundUrl
            ? {
                backgroundImage: `url('${backgroundUrl}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : {})
        }}
      >
        <div className="bg-black bg-opacity-60 p-8 rounded-lg text-center">
          <div className="w-16 h-16 border-t-4 border-b-4 border-white rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-xl">Récupération de votre vidéo...</p>
          <p className="text-white/60 mt-2">Veuillez patienter </p>
         
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        ...(backgroundUrl
          ? {
              backgroundImage: `url('${backgroundUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : {})
      }}
    >
      {/* Overlay léger pour améliorer la lisibilité */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      {/* Contenu principal */}
      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <div className="bg-white bg-opacity-95 p-8 rounded-lg shadow-xl w-full">
          {/* Afficher le nom de l'événement en haut */}
          {event && (
            <div className="mb-4 text-center">
              <h2 
                className="text-xl font-bold"
                style={{ color: 'var(--primary-color)' }}
              >
                {event.name}
              </h2>
            </div>
          )}
          
          <h1 
            className="text-2xl font-bold mb-6 text-center"
            style={{ color: 'var(--primary-color)' }}
          >
            🎉 Votre vidéo est prête !
          </h1>
          
          <p className="mb-6 text-center text-gray-600">
            Scannez ce QR code pour accéder à votre performance
          </p>
          
          <div className="bg-white p-4 rounded-lg shadow-inner mb-6"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 70%, rgba(246,240,255,1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.1)'
            }}
          >
            <QRCodeDisplay url={pageUrl} size={250} />
          </div>
          
          {loadError && (
            <div className="p-3 rounded-md text-sm text-center"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                borderLeft: '3px solid var(--secondary-color)',
                color: '#9f1239'
              }}
            >
              <p>{loadError}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleShareButtonClick}
              className="text-white px-6 py-3 rounded-lg transition-all duration-300 w-full"
              style={{ 
                background: 'var(--secondary-gradient)',
                boxShadow: '0 4px 10px rgba(236, 72, 153, 0.3)'
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                {showForm ? "Partage en cours..." : emailSent ? "Partager à nouveau" : "Partager le lien par email"}
              </span>
            </button>
            
            <button
              onClick={() => router.push(`/event/${id}`)}
              className="px-6 py-3 rounded-lg transition-all duration-300 w-full"
              style={{ 
                background: 'var(--primary-gradient)',
                color: 'white',
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)'
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Retour 
              </span>
            </button>
          </div>
          
          <p className="mt-4 text-xs text-center" style={{ color: 'var(--primary-color)' }}>
            ID de session: {sessionId}
          </p>
        </div>
      </div>

      {/* Popup de formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="p-6">
              <h2 
                className="text-2xl font-bold mb-4 text-center"
                style={{ color: 'var(--primary-color)' }}
              >
                Partagez votre performance
              </h2>

              {formError && (
                <div className="p-3 rounded mb-4"
                  style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    borderLeft: '3px solid var(--secondary-color)',
                    color: '#9f1239'
                  }}
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Votre nom
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border-2 text-white placeholder-gray-300"
                    style={{ 
                      borderColor: 'rgba(139, 92, 246, 0.3)'
                    }}
                    placeholder="Entrez votre nom"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Votre email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg border-2 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      borderColor: 'rgba(139, 92, 246, 0.3)'
                    }}
                    placeholder="votre@email.com"
                  />
                </div>

                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="rgpdConsent"
                      name="rgpdConsent"
                      type="checkbox"
                      checked={formData.rgpdConsent}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300"
                      style={{ color: 'var(--primary-color)' }}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="rgpdConsent" className="font-medium text-gray-700">
                     Accepter les conditions RGPD
                    </label>
                    <p className="text-gray-500 text-xs mt-1">
                      En cochant cette case, vous acceptez que nous utilisions vos données personnelles pour vous contacter à propos de votre performance karaoké. Vos données ne seront pas partagées avec des tiers.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-md text-sm"
                  style={{ 
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: 'var(--primary-dark)'
                  }}
                >
                  <p>Un email contenant votre vidéo karaoké {event ? `de l&apos;événement &quot;${event.name}&quot;` : ''} sera envoyé depuis notre plateforme avec un message personnalisé.</p>
                </div>

                <div className="flex flex-col gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="text-white px-6 py-3 rounded-lg transition-all duration-300 flex justify-center w-full"
                    style={{ 
                      background: isSubmitting 
                        ? 'var(--primary-gradient)' 
                        : 'var(--secondary-gradient)',
                      opacity: isSubmitting ? 0.7 : 1,
                      boxShadow: '0 4px 10px rgba(236, 72, 153, 0.3)'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Envoi en cours...
                      </>
                    ) : "Envoyer l'email"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="border px-6 py-3 rounded-lg transition-all duration-300 w-full"
                    style={{ 
                      borderColor: 'var(--primary-color)', 
                      color: 'var(--primary-color)' 
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fonction temporaire pour simuler la récupération d'une URL signée
async function getSignedUrl(path: string): Promise<string | null> {
  // Dans une implémentation réelle, vous appelleriez ici votre API pour générer une URL signée
  // Pour l'instant, on retourne simplement l'URL d'origine
  console.log("Getting signed URL for:", path);
  return null;
}
