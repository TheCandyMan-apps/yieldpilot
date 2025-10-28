import { NavLink } from 'react-router-dom';
import { Home, Search, Users, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/deals-v2', icon: Search, label: 'Deals' },
    { to: '/network', icon: Users, label: 'Network' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaders' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 transition-colors',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
