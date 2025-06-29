import { useState, useEffect, useRef } from 'react';
import { FiMenu } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

// Fonction utilitaire pour lire un cookie par son nom
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Génère une couleur à partir d'une chaîne
function generateColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  // Lire et décoder le cookie shared_auth_token pour obtenir le userId
  useEffect(() => {
    const token = getCookieValue('shared_auth_token');
    if (token) {
      try {
        const decoded = atob(decodeURIComponent(token));
        const payload = JSON.parse(decoded);
        if (payload.userId) {
          setUserId(payload.userId);
        }
      } catch {
        setUserId(null);
      }
    }
  }, []);

  // Aller chercher l'email dans admin_users à partir du userId
  useEffect(() => {
    const fetchEmail = async () => {
      if (userId) {
        const { data } = await supabase
          .from('admin_users')
          .select('email')
          .eq('id', userId)
          .single();
        if (data && data.email) {
          setUserEmail(data.email);
        }
      }
    };
    fetchEmail();
  }, [userId]);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    // Si vous avez une route API logout, utilisez-la, sinon gardez signOut
    await supabase.auth.signOut?.();
    router.push('/auth/login');
  };

  const email = userEmail || '';
  const userInitial = email ? email.charAt(0).toUpperCase() : 'U';
  const avatarColor = email ? generateColor(email) : 'hsl(250, 70%, 45%)';

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
      >
        <FiMenu className="h-6 w-6" />
      </button>
      <div className="lg:hidden flex-1 text-center">
        <h1 className="text-xl font-bold text-gray-800">Admin</h1>
      </div>
      <div className="hidden lg:block flex-1">
        <h1 className="text-xl font-semibold text-gray-800">Tableau Administration</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center space-x-2 focus:outline-none"
          >
            <div
              className="flex items-center justify-center w-10 h-10 rounded-full text-white shadow-md hover:shadow-lg transition-all duration-200 border-2 border-white"
              style={{ background: `linear-gradient(90deg, ${avatarColor}, #7c3aed)` }}
            >
              <span className="text-lg font-semibold">{userInitial}</span>
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-sm font-medium text-gray-700">Mon compte</span>
              <span className="text-xs text-gray-500 truncate max-w-[120px]">{email}</span>
            </div>
            <svg className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 transition-all duration-200 transform origin-top-right">
              <div className="p-4 border-b border-gray-100">
                <p className="text-sm text-gray-500">Connecté en tant que:</p>
                <p className="font-medium text-gray-800 truncate">{email}</p>
                {userId && (
                  <p className="text-xs text-gray-400 mt-1">
                    ID utilisateur: <span className="font-mono">{userId}</span>
                  </p>
                )}
              </div>
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
