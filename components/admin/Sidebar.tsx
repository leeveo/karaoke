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
          <div className={`${!isOpen && 'opacity-0'} transition-opacity duration-200`}>
            <span className="text-xl font-bold">KaraokeAdmin</span>
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
            <span className="text-xl font-bold text-white">KaraokeAdmin</span>
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
