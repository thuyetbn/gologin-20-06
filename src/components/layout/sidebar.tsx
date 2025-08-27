"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
    Globe,
    Home,
    Menu,
    Monitor,
    Settings,
    Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  currentMajorVersion: string;
  latestMajorVersion: string;
}

const Sidebar = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let mounted = true;

    // Listen for browser update notifications
    if (typeof window !== 'undefined' && (window as any).api) {
      const handleUpdateAvailable = (event: any, info: UpdateInfo) => {
        if (!mounted) return;
        
        setHasUpdate(true);
        setUpdateInfo(info);
        console.log('Browser update available:', info);
      };

      (window as any).api.on('browser-update-available', handleUpdateAvailable);
    }

    return () => {
      mounted = false;
      // Note: removeListener is not reliably available in our API
      // The listeners will be cleaned up when the component unmounts
    };
  }, []);

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
    },
    {
      name: "Profiles",
      href: "/profiles",
      icon: Users,
    },
    {
      name: "Groups",
      href: "/groups",
      icon: Users,
    },
    {
      name: "Proxies",
      href: "/proxies",
      icon: Globe,
    },

    {
      name: "Browser Management",
      href: "/browser-management",
      icon: Monitor,
      hasNew: hasUpdate,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navigation.map((item) => {
        const isActive = router.pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary relative",
              isActive && "bg-muted text-primary",
              mobile && "text-lg"
            )}
            onClick={() => mobile && setIsOpen(false)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.name}</span>
            {item.hasNew && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                NEW
              </Badge>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Monitor className="h-6 w-6" />
              <span className="">GoLogin Manager</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              <NavItems />
            </nav>
          </div>
          <div className="mt-auto p-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile Header with Hamburger */}
      <div className="md:hidden border-b bg-muted/40">
        <div className="flex h-14 items-center px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 font-semibold mb-6">
                  <Monitor className="h-6 w-6" />
                  <span>GoLogin Manager</span>
                </div>
                <nav className="grid gap-2 text-lg font-medium flex-1">
                  <NavItems mobile />
                </nav>
                <div className="mt-auto pt-6">
                  <ThemeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <Link href="/" className="flex items-center gap-2 font-semibold justify-center">
              <Monitor className="h-6 w-6" />
              <span>GoLogin Manager</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 