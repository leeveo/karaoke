'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  FiMenu, 
  FiSearch, 
  FiBell, 
  FiChevronDown, 
  FiLogOut,
  FiUser,
  FiSettings
} from 'react-icons/fi';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function AdminHeader({ toggleSidebar }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <FiMenu className="h-6 w-6" />
            </button>
            
            {/* Logo for Mobile */}
            <div className="md:hidden flex items-center ml-2">
              <span className="font-bold text-xl text-blue-700">KaraokeAdmin</span>
            </div>
            
            {/* Search bar */}
            <div className="hidden md:flex md:ml-4 lg:ml-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Rechercher..."
                  type="search"
                />
              </div>
            </div>
          </div>
          
          {/* Right side buttons */}
          <div className="flex items-center">
            {/* Notifications */}
            <button className="p-2 rounded-full text-gray-600 hover:text-gray-900 relative">
              <FiBell className="h-6 w-6" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            
            {/* Profile dropdown */}
            <div className="ml-3 relative">
              <div>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center max-w-xs rounded-full focus:outline-none"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    A
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-700 hidden md:block">
                    Administrateur
                  </span>
                  <FiChevronDown className="ml-1 h-4 w-4 text-gray-500 hidden md:block" />
                </button>
              </div>
              
              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <Link 
                    href="/admin/profile" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiUser className="mr-2 h-4 w-4" />
                    Votre profil
                  </Link>
                  <Link 
                    href="/admin/settings" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiSettings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                  <Link 
                    href="/logout" 
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <FiLogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
