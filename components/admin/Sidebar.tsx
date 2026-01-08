'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiCalendar, 
  FiMusic, 
  FiUsers, 
  FiSettings, 
  FiChevronLeft, 
  FiChevronRight 
} from 'react-icons/fi';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function AdminSidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  
  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: FiHome },
    { name: 'Évènements', href: '/admin/events', icon: FiCalendar },
    { name: 'Chansons', href: '/admin/songs', icon: FiMusic },
    { name: 'Utilisateurs', href: '/admin/users', icon: FiUsers },
    { name: 'Paramètres', href: '/admin/settings', icon: FiSettings },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <div 
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } hidden md:block relative h-screen bg-gradient-to-b from-blue-900 to-blue-700 text-white transition-all duration-300 ease-in-out z-20`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <div className={`${!isOpen && 'opacity-0'} transition-opacity duration-200 flex items-center gap-2`}>
            <div className="relative flex items-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="url(#gradient)" />
                <path d="M10 12h12M10 16h12M10 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">Leerycs</span>
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-full hover:bg-blue-800 focus:outline-none"
          >
            {isOpen ? <FiChevronLeft /> : <FiChevronRight />}
          </button>
        </div>
        
        <div className="px-2 py-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || 
                              (item.href !== '/admin' && pathname?.startsWith(item.href));
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-800 text-white'
                        : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                    } flex items-center p-2 rounded-md group transition-all duration-200`}
                  >
                    <item.icon className={`${isOpen ? 'mr-3' : 'mr-0'} h-6 w-6`} />
                    <span className={`${!isOpen && 'hidden'} transition-all duration-200`}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <div 
        className={`${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        } md:hidden fixed inset-0 z-40 bg-gray-800 bg-opacity-50 transition-all duration-300`}
        onClick={() => setIsOpen(false)}
      >
        <div 
          className="absolute top-0 left-0 w-64 h-full bg-gradient-to-b from-blue-900 to-blue-700 transform transition-transform duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="url(#gradient-mobile)" />
                <path d="M10 12h12M10 16h12M10 20h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="gradient-mobile" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">Leerycs</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-blue-800 focus:outline-none text-white"
            >
              <FiChevronLeft />
            </button>
          </div>
          
          <div className="px-2 py-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || 
                                (item.href !== '/admin' && pathname?.startsWith(item.href));
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`${
                        isActive
                          ? 'bg-blue-800 text-white'
                          : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                      } flex items-center p-2 rounded-md`}
                    >
                      <item.icon className="mr-3 h-6 w-6" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
