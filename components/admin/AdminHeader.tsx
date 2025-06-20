import { useState } from 'react';
import { FiMenu, FiBell, FiUser, FiSettings } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface AdminHeaderProps {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const router = useRouter();

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
            <span className="hidden md:block text-sm font-medium text-gray-700">Admin</span>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
