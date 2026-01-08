import Link from 'next/link';
import { 
  FiGrid, 
  FiCalendar, 
  FiMusic, 
  FiSettings,
  FiBarChart2
} from 'react-icons/fi';

interface AdminSidebarProps {
  activeTab: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ activeTab, isOpen, onClose }: AdminSidebarProps) {
  // Navigation items configuration
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard', icon: <FiGrid className="h-5 w-5" /> },
    { id: 'events', label: 'Événements', href: '/admin/events', icon: <FiCalendar className="h-5 w-5" /> },
    { id: 'songs', label: 'Chansons', href: '/admin/songs', icon: <FiMusic className="h-5 w-5" /> },
    { id: 'analytics', label: 'Statistiques', href: '/admin/analytics', icon: <FiBarChart2 className="h-5 w-5" /> },
   
    { id: 'settings', label: 'Paramètres', href: '/admin/settings', icon: <FiSettings className="h-5 w-5" /> },
  ];

  return (
    <div
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}
    >
      <div className="p-6">
        <div className="flex items-center justify-center mb-8">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="url(#gradient-sidebar)" />
              <path d="M12 15h16M12 20h16M12 25h10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="gradient-sidebar" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-400">
              Leerycs
            </span>
          </Link>
        </div>
        
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => {
                if (isOpen) onClose();
              }}
            >
              <span className={`${activeTab === item.id ? 'text-blue-500' : 'text-gray-400'} mr-3`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            <p className="font-medium text-blue-600">Aide & Support</p>
            <p className="mt-1 text-xs">Besoin d&apos;aide . Contactez-nous par email.</p>
            <a 
              href="mailto:support@leerycs.com" 
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 block"
            >
              support@leerycs.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
