'use client';

import { useSearchParams, useParams, useRouter } from 'next/navigation';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { useEffect, useState } from 'react';

export default function QRPage() {
  const searchParams = useSearchParams();
  const { sessionId } = useParams();
  const [pageUrl, setPageUrl] = useState<string | null>(searchParams.get('pageUrl'));
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();
  
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
              const response = await fetch(pageUrl, { 
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
          router.push('/');
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    };
    
    getQrUrl();
  }, [pageUrl, router]);

  // États
  const [isSharing, setIsSharing] = useState(false);
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
      router.push('/');
    }
    
    // Préremplir le message et le sujet - ces champs ne seront pas visibles pour l'utilisateur
    if (pageUrl) {
      setFormData(prev => ({
        ...prev,
        subject: 'Ma performance karaoké à partager',
        message: `Salut !\n\nJe viens de faire une performance karaoké que j'aimerais partager avec toi.\n\nClique sur le bouton ci-dessous pour la regarder !`
      }));
    }
  }, [pageUrl, router]);

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
          sessionId: sessionId
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

  // Gérer la soumission du formulaire - les champs cachés sont toujours envoyés
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      // Envoyer l'email via notre API avec tous les champs (y compris sujet et message)
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
      setFormError('Erreur lors de l\'envoi de l\'email, veuillez réessayer');
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
      <div className="app-background min-h-screen flex flex-col items-center justify-center">
        <div className="bg-black bg-opacity-60 p-8 rounded-lg text-center">
          <div className="w-16 h-16 border-t-4 border-b-4 border-white rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white text-xl">Récupération de votre vidéo...</p>
          <p className="text-white/60 mt-2">Veuillez patienter ou revenir à l'accueil</p>
         
        </div>
      </div>
    );
  }

  return (
    <div className="app-background min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        backgroundImage: "linear-gradient(135deg, #080424 0%, #160e40 100%)"
      }}
    >
      {/* Overlay léger pour améliorer la lisibilité */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      {/* Contenu principal */}
      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <div className="bg-white bg-opacity-95 p-8 rounded-lg shadow-xl w-full">
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
            <div 
              className="mb-4 p-3 rounded-md text-sm text-center"
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
              disabled={isSharing}
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
                {isSharing ? "Partage en cours..." : emailSent ? "Partager à nouveau" : "Partager le lien par email"}
              </span>
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 rounded-lg transition-all duration-300 w-full"
              style={{ 
                background: 'var(--primary-gradient)',
                color: 'white',
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)'
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Nouvelle chanson
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

              {/* Popup de formulaire - Version simplifiée sans sujet ni message */}
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
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      focusRing: 'var(--primary-color)' 
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
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      focusRing: 'var(--primary-color)' 
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
                      J'accepte les conditions RGPD
                    </label>
                    <p className="text-gray-500 text-xs mt-1">
                      En cochant cette case, vous acceptez que nous utilisions vos données personnelles pour vous contacter à propos de votre performance karaoké. Vos données ne seront pas partagées avec des tiers.
                    </p>
                  </div>
                </div>

                {/* Info sur ce qui sera envoyé */}
                <div className="p-3 rounded-md text-sm"
                  style={{ 
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: 'var(--primary-dark)'
                  }}
                >
                  <p>Un email contenant votre vidéo karaoké sera envoyé depuis notre plateforme avec un message personnalisé.</p>
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