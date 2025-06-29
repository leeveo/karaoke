import { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { signOut } from '@/lib/supabase/auth';
import { useRouter } from 'next/navigation';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

// Utilitaire pour lire le cookie côté client
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
  return null;
}

// Décoder le token base64
function decodeSharedAuthToken(token: string | null) {
  if (!token) return null;
  try {
    const decoded = atob(token);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getCookie('shared_auth_token');
    const data = decodeSharedAuthToken(token);
    if (data) {
      setUserInfo({
        email: data.email,
        name: data.name,
      });
    }
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

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
        <button className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none relative">
          <FiBell className="h-6 w-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center space-x-2 focus:outline-none"
          >
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <FiUser className="h-4 w-4" />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              {userInfo?.name || userInfo?.email || 'Admin'}
            </span>
          </button>
          
          {isProfileMenuOpen && (
            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-30">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                <a
                  href="/admin/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <FiSettings className="mr-2 h-4 w-4" />
                  Paramètres
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <FiLogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
