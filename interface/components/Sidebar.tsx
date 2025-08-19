import { 
  LayoutTemplate, 
  BarChart2, 
  Search, 
  Gauge, 
  Users, 
  Settings, 
  BookOpen, 
  HelpCircle, 
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const mainNavItems = [
  { href: '#', icon: LayoutTemplate, label: 'Page Builder' },
  { href: '#', icon: BarChart2, label: 'Analytics' },
  { href: '#', icon: Search, label: 'SEO' },
  { href: '#', icon: Gauge, label: 'Performance' },
  { href: '#', icon: Users, label: 'CRM' },
];

const accountNavItems = [
  { href: '#', icon: Settings, label: 'Settings' },
  { href: '#', icon: BookOpen, label: 'Tutorial' },
  { href: '#', icon: HelpCircle, label: 'Help' },
];

const footerNavItems = [
  { href: '#', icon: ExternalLink, label: 'Terms of Use' },
  { href: '#', icon: ExternalLink, label: 'Privacy Policy' },
];

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  return (
    <aside 
      className={`bg-background border-e transition-all duration-300 ${isOpen ? 'w-48' : 'w-14'} flex flex-col relative dark:border-gray-800`}
    >
      

      <div className={`flex items-center h-[70px] px-3  ${!isOpen ? 'justify-center' : 'justify-start'}`}>
        <a className={`flex-none text-lg font-semibold transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 h-auto'}`} href="#">
          {isOpen ? 'FoxFunnel' : ''}
        </a>
      </div>

      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-[8%] right-[-12px] z-50 p-1 bg-background border text-foreground rounded-md shadow-sm hover:bg-accent focus:outline-none transform rotate-45 cursor-pointer dark:bg-[#262626] dark:border-gray-800"
      >
        <span className="block transform -rotate-45">
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>
      
      {/* Scrollable navigation area */}
      <div className="flex-grow overflow-y-auto">
        <nav className="p-1.5 w-full flex flex-col">
          <ul className="space-y-1">
            {mainNavItems.map(({ href, icon: Icon, label }) => (
              <li key={label}>
                <a 
                  className={`flex items-center gap-x-2 py-2 px-2.5 text-sm text-foreground rounded-lg hover:bg-accent transition-all duration-200 ${!isOpen && 'justify-center'}`} 
                  href={href}
                >
                  <Icon className="shrink-0 size-4.5" />
                  <span className={`transition-all duration-200 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {label}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <span className={`px-2.5 text-xs text-muted-foreground uppercase font-semibold ${isOpen ? 'block' : 'hidden'}`}>
              Account
            </span>
            <ul className="space-y-1 mt-2">
              {accountNavItems.map(({ href, icon: Icon, label }) => (
                <li key={label}>
                  <a 
                    className={`flex items-center gap-x-2 py-2 px-2.5 text-sm text-foreground rounded-lg hover:bg-accent transition-all duration-200 ${!isOpen && 'justify-center'}`} 
                    href={href}
                  >
                    <Icon className="shrink-0 size-4.5" />
                    <span className={`transition-all duration-200 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                      {label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      {/* Static footer area */}
      <div className="absolute bottom-0 p-1.5 w-full">
        <ul className="space-y-0">
          {footerNavItems.map(({ href, icon: Icon, label }) => (
            <li key={label}>
              <a 
                className={`flex items-center gap-x-2 py-1 px-2.5 text-xs text-foreground rounded-lg hover:bg-accent transition-all duration-200 ${!isOpen && 'justify-center'}`} 
                href={href}
              >
                <Icon className="shrink-0 size-4.5" />
                <span className={`transition-all duration-200 ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                  {label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
} 