import { ReactNode } from 'react';
import { LayoutDashboard, PlusCircle, BarChart2, Settings, FileText } from 'lucide-react';

export type Page = 'dashboard' | 'entry' | 'analytics' | 'costs' | 'reports';

interface LayoutProps {
  children: ReactNode;
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entry', label: 'Entry', icon: PlusCircle },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'costs', label: 'Costs', icon: Settings },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export default function Layout({ children, activePage, onNavigate }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-screen-xl mx-auto">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--cyan))' }}>
            <BarChart2 className="w-4 h-4" style={{ color: 'hsl(var(--primary-foreground))' }} />
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>LSRIS</span>
        </div>
        <span className="section-header text-xs">Revenue Intelligence</span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24 scrollbar-thin">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-screen-xl mx-auto flex items-center justify-around px-2 py-2 border-t"
        style={{ background: 'hsl(var(--sidebar-background))', borderColor: 'hsl(var(--border))' }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
