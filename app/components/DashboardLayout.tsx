'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  
  // Páginas que não devem mostrar a sidebar
  const noSidebarPages = ['/login', '/'];
  const shouldShowSidebar = !noSidebarPages.includes(pathname);

  if (!shouldShowSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main 
        className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}
      >
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}
