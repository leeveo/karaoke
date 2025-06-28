import Link from 'next/link';
import Image from 'next/image';
import { 
  FiGrid, 
  FiCalendar, 
  FiMusic, 
  FiSettings,
  FiBarChart2,
  FiPlusCircle,
  FiImage,
  FiExternalLink
} from 'react-icons/fi';
import { useState } from 'react';

interface AdminSidebarProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
  setActiveTab?: (tab: string) => void; // Optional, for parent to control tab
}

export default function AdminSidebar({ activeTab, isOpen, onClose, setActiveTab }: AdminSidebarProps) {
  const [photoboothOpen, setPhotoboothOpen] = useState(true);

  return (
    <div
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}
    >
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col items-center">
          <Image
            src="/logo/logo.png"
            alt="WaiBooth Logo"
            width={180}
            height={40}
            className="mb-2"
            priority
          />
        </div>
        <p className="text-sm text-purple-600 font-bold italic text-center">
          "Automatisez la magie.<br/> Laissez Waibooth gérer le show."
        </p>
      </div>
      <nav className="mt-6 flex flex-col gap-2 text-sm">
        <div className="px-6 py-2 lg:hidden">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <span className="text-sm">Fermer le menu</span>
          </button>
        </div>
        <div className="mx-4 my-2 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 shadow-inner p-2">
          <button
            type="button"
            className="w-full px-4 py-2 font-bold text-gray-700 flex items-center gap-2 focus:outline-none"
            onClick={() => setPhotoboothOpen(!photoboothOpen)}
          >
            <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Karaoke
          </button>
          <div className="flex flex-col transition-all duration-200 overflow-hidden max-h-96 opacity-100">
            {/* Main navigation items */}
            {[
              { label: 'Dashboard', icon: <FiGrid />, tab: 'dashboard', href: '/admin/dashboard' },
              { label: 'Evénements', icon: <FiPlusCircle />, tab: 'setup', href: '/admin/events' },
              { label: 'Chansons', icon: <FiImage />, tab: 'songs', href: '/admin/songs' },
              { label: 'Stats', icon: <FiBarChart2 />, tab: 'analytics', href: '/admin/analytics' },
            ].map(({ label, icon, tab, href }) => (
              <Link
                key={tab}
                href={href}
                className={`flex items-center gap-3 px-8 py-2 mx-2 my-1 rounded-lg transition-all duration-150 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold shadow'
                    : 'text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 hover:shadow'
                }`}
                onClick={() => {
                  if (setActiveTab) setActiveTab(tab);
                  if (isOpen) onClose();
                }}
              >
                {icon}
                <span className="text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </div>
        {/* Liens externes photomosaic, karaoke, photobooth IA */}
        <div className="px-6 py-2 mt-6 font-bold text-gray-700 flex items-center gap-2">
          <FiExternalLink className="w-4 h-4" />
          Accès aux Autres Applications
        </div>
        <div className="flex flex-col gap-3 px-4">
          {[
            {
              label: 'Photo mosaique',
              url: process.env.NEXT_PUBLIC_PHOTO_MOSAIQUE_URL || 'https://photomosaic.waibooth.app',
              icon: <FiGrid className="w-5 h-5" />,
              color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
            },
            {
              label: 'Karaoke',
              url: process.env.NEXT_PUBLIC_KARAOKE_URL || 'https://karaoke.waibooth.app',
              icon: <FiMusic className="w-5 h-5" />,
              color: 'bg-pink-100 text-pink-700 border-pink-300',
            },
            {
              label: 'Photobooth IA',
              url: process.env.NEXT_PUBLIC_PHOTOBOOTH_IA_URL || 'https://photobooth.waibooth.app',
              icon: <FiMusic className="w-5 h-5" />,
              color: 'bg-green-100 text-green-700 border-green-300',
            }
          ].map(app => (
            <a
              key={app.label}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${app.color} shadow-sm hover:scale-[1.03] transition-transform`}
            >
              {app.icon}
              <span className="font-medium">{app.label}</span>
            </a>
          ))}
        </div>
      </nav>
      {/* Help & Support section */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium text-blue-600">Aide & Support</p>
            <p className="mt-1 text-xs">Besoin d&apos;aide . Contactez-nous par email.</p>
            <a 
              href="mailto:support.karaoke@waibooth.app" 
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 block"
            >
              support@karaoke.example.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
