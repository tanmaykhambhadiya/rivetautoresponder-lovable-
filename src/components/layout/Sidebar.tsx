import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Mail,
  Calendar,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Edit3,
  BarChart3,
  UserCog,
  Shield,
  Inbox,
  Zap,
  Building2,
  Crown,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useEffect, useRef } from 'react';
import { useSidebarPreferences } from '@/hooks/useSidebarPreferences';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Email Logs', href: '/emails', icon: Mail },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Nurses', href: '/nurses', icon: Users },
  { name: 'Units', href: '/units', icon: Building2 },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Prompts', href: '/prompts', icon: Edit3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Auto-Response', href: '/settings/auto-response', icon: Zap },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: UserCog },
  { name: 'Admin Panel', href: '/admin', icon: Shield },
];

const superAdminNavigation = [
  { name: 'SaaS Admin', href: '/super-admin', icon: Crown },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, isAdmin, profile } = useAuth();
  const {
    isCollapsed,
    currentWidth,
    isResizing,
    toggleCollapsed,
    setWidth,
    startResizing,
    commitWidth,
    MIN_WIDTH,
    MAX_WIDTH,
  } = useSidebarPreferences();

  const isSuperAdmin = profile?.email === 'rivetglobalai@gmail.com';
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle mouse move during resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();
      const newWidth = e.clientX;
      setWidth(newWidth);
    },
    [isResizing, setWidth]
  );

  // Handle mouse up to end resize
  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      commitWidth();
    }
  }, [isResizing, commitWidth]);

  // Attach global event listeners during resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const renderNavItem = (item: (typeof navigation)[0], showTooltip = false) => {
    const isActive = location.pathname === item.href;
    const linkContent = (
      <NavLink
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'animate-pulse-slow')} />
        {!isCollapsed && <span className="font-medium truncate">{item.name}</span>}
      </NavLink>
    );

    if (showTooltip && isCollapsed) {
      return (
        <Tooltip key={item.name} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.name}>{linkContent}</div>;
  };

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'relative flex flex-col h-screen bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        isResizing && 'transition-none'
      )}
      style={{ width: currentWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src="/rivet-logo.png" alt="Rivet AI" className="h-8 w-8 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-sidebar-primary-foreground truncate">Rivet AI</h1>
              <p className="text-xs text-sidebar-foreground/70 truncate">Smart Intelligence</p>
            </div>
          </div>
        ) : (
          <img src="/rivet-logo.png" alt="Rivet AI" className="h-8 w-8 flex-shrink-0" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
          onClick={toggleCollapsed}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => renderNavItem(item, true))}

        {isAdmin && (
          <>
            <div className={cn('my-4 px-3', isCollapsed && 'px-2')}>
              <div className="h-px bg-sidebar-border" />
              {!isCollapsed && (
                <p className="mt-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Admin
                </p>
              )}
            </div>
            {adminNavigation.map((item) => renderNavItem(item, true))}
          </>
        )}

        {isSuperAdmin && (
          <>
            <div className={cn('my-4 px-3', isCollapsed && 'px-2')}>
              <div className="h-px bg-sidebar-border" />
              {!isCollapsed && (
                <p className="mt-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Super Admin
                </p>
              )}
            </div>
            {superAdminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const linkContent = (
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name} delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.name}>{linkContent}</div>;
            })}
          </>
        )}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        {!isCollapsed && profile && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{profile.email}</p>
          </div>
        )}
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
                onClick={signOut}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        )}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className={cn(
            'absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-primary/30 transition-colors',
            isResizing && 'bg-primary/50'
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            startResizing();
          }}
        >
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 p-1 rounded bg-sidebar-border opacity-0 group-hover:opacity-100 transition-opacity',
              isResizing && 'opacity-100'
            )}
          >
            <GripVertical className="h-4 w-4 text-sidebar-foreground/50" />
          </div>
        </div>
      )}
    </div>
  );
}
