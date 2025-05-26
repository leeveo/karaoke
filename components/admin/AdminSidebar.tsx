import Link from 'next/link';
import { 
  FiGrid, 
  FiCalendar, 
  FiMusic, 
  FiUsers, 
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
          <Link href="/admin/dashboard" className="flex items-center">
            <img src="/logo.png" alt="Karaoke SaaS Logo" className="h-10 mr-3" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-400">
              KaraokeSaaS
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
            <p className="mt-1 text-xs">Besoin d'aide? Contactez-nous via le centre d'assistance.</p>
            <a 
              href="mailto:support@karaoke.example.com" 
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
