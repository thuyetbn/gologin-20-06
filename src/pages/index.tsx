"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  ArrowUpRight,
  Globe,
  Play,
  Server,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalProfiles: number;
  runningProfiles: number;
  totalGroups: number;
  totalProxies: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProfiles: 0,
    runningProfiles: 0,
    totalGroups: 0,
    totalProxies: 0,
  });

  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [profiles, groups, proxies] = await Promise.all([
          window.api.invoke("profiles:get"),
          window.api.invoke("groups:get"),
          window.api.invoke("proxies:get"),
        ]);

        setStats({
          totalProfiles: profiles?.length || 0,
          runningProfiles: 0, // You can add running profiles logic here
          totalGroups: groups?.length || 0,
          totalProxies: proxies?.length || 0,
        });

        // Get recent profiles (last 5)
        const recent = profiles
          ?.sort((a: any, b: any) => 
            new Date(b.CreatedAt || 0).getTime() - new Date(a.CreatedAt || 0).getTime()
          )
          .slice(0, 5) || [];
        setRecentProfiles(recent);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: "Total Profiles",
      value: stats.totalProfiles,
      description: "Active browser profiles",
      icon: Users,
      href: "/profiles",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Running Profiles", 
      value: stats.runningProfiles,
      description: "Currently active",
      icon: Activity,
      href: "/profiles",
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Groups",
      value: stats.totalGroups,
      description: "Profile groups",
      icon: Server,
      href: "/groups",
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Proxies",
      value: stats.totalProxies,
      description: "Proxy connections",
      icon: Globe,
      href: "/proxies", 
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-16 md:pt-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/profiles">
              <Play className="mr-2 h-4 w-4" />
              Launch Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
                <Link href={card.href}>
                  <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                    View all <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Profiles */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Profiles</CardTitle>
            <CardDescription>
              Your latest created browser profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProfiles.length > 0 ? (
                recentProfiles.map((profile: any) => (
                  <div
                    key={profile.Id}
                    className="flex items-center justify-between space-x-4"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-9 w-9 bg-muted rounded-lg flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {profile.Name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(profile.CreatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Ready</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No profiles created yet</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href="/profiles">Create your first profile</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used features
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild className="justify-start" variant="outline">
              <Link href="/profiles">
                <Users className="mr-2 h-4 w-4" />
                Manage Profiles
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/groups">
                <Server className="mr-2 h-4 w-4" />
                Organize Groups
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/proxies">
                <Globe className="mr-2 h-4 w-4" />
                Setup Proxies
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/settings">
                <Activity className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Current system status and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Profile Usage</span>
                <span className="font-medium">
                  {stats.runningProfiles}/{stats.totalProfiles}
                </span>
              </div>
              <Progress 
                value={stats.totalProfiles > 0 ? (stats.runningProfiles / stats.totalProfiles) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Storage</span>
                <span className="font-medium text-green-600">Good</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>System Health</span>
                <span className="font-medium text-green-600">Optimal</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 