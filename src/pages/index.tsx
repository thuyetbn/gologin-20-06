
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
import { useCachedData, type Profile } from "@/hooks/use-cached-data";
import {
  Activity,
  ArrowUpRight,
  Globe,
  Play,
  Server,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function Dashboard() {
  const { profiles, groups, proxies } = useCachedData();
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  // Fetch running profiles (not in shared cache since it's volatile)
  useEffect(() => {
    const fetchRunning = async () => {
      try {
        if (typeof window === 'undefined' || !window.api) return;
        const running = await window.api.invoke("profiles:getRunning");
        const runningSet = new Set<string>(
          (running || []).map((r: { profileId: string }) => r.profileId)
        );
        setRunningIds(runningSet);
      } catch (error) {
        console.error("Failed to fetch running profiles:", error);
      }
    };

    fetchRunning();

    // Listen for browser status changes to update running count
    if (typeof window !== 'undefined' && window.api) {
      const handleStatusChange = (_event: unknown, data: { profileId: string; status?: { status: string } }) => {
        setRunningIds(prev => {
          const next = new Set(prev);
          if (data.status?.status === 'running') {
            next.add(data.profileId);
          } else if (data.status?.status === 'stopped') {
            next.delete(data.profileId);
          }
          return next;
        });
      };

      window.api.on('browser-status-changed', handleStatusChange);
      return () => {
        window.api.removeListener('browser-status-changed', handleStatusChange);
      };
    }
  }, []);

  // Derive stats from cached data
  const stats = useMemo(() => ({
    totalProfiles: profiles.length,
    runningProfiles: runningIds.size,
    totalGroups: groups.length,
    totalProxies: proxies.length,
  }), [profiles.length, groups.length, proxies.length, runningIds.size]);

  // Get recent profiles (last 5)
  const recentProfiles = useMemo(() => {
    return [...profiles]
      .sort((a: Profile, b: Profile) =>
        new Date(b.CreatedAt || 0).getTime() - new Date(a.CreatedAt || 0).getTime()
      )
      .slice(0, 5);
  }, [profiles]);

  const statCards = [
    {
      title: "Tổng Profiles",
      value: stats.totalProfiles,
      description: "Browser profiles đã tạo",
      icon: Users,
      href: "/profiles",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Đang chạy",
      value: stats.runningProfiles,
      description: "Profiles đang hoạt động",
      icon: Activity,
      href: "/profiles",
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Nhóm",
      value: stats.totalGroups,
      description: "Nhóm profiles",
      icon: Server,
      href: "/groups",
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Proxy",
      value: stats.totalProxies,
      description: "Kết nối proxy",
      icon: Globe,
      href: "/proxies",
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-16 md:pt-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Trang chủ</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/profiles">
              <Play className="mr-2 h-4 w-4" />
              Chạy Profile
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
                    Xem tất cả <ArrowUpRight className="ml-1 h-3 w-3" />
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
            <CardTitle>Profiles gần đây</CardTitle>
            <CardDescription>
              Các browser profiles được tạo gần nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProfiles.length > 0 ? (
                recentProfiles.map((profile: Profile) => (
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
                          Tạo ngày {new Date(profile.CreatedAt || '').toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={runningIds.has(profile.Id) ? "default" : "outline"}>
                      {runningIds.has(profile.Id) ? "Đang chạy" : "Sẵn sàng"}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Chưa có profile nào</p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link href="/profiles">Tạo profile đầu tiên</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>
              Các tính năng thường dùng
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild className="justify-start" variant="outline">
              <Link href="/profiles">
                <Users className="mr-2 h-4 w-4" />
                Quản lý Profiles
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/groups">
                <Server className="mr-2 h-4 w-4" />
                Quản lý Nhóm
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/proxies">
                <Globe className="mr-2 h-4 w-4" />
                Cài đặt Proxy
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/settings">
                <Activity className="mr-2 h-4 w-4" />
                Cài đặt
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng quan hệ thống</CardTitle>
          <CardDescription>
            Trạng thái và hiệu suất hiện tại
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Profiles đang chạy</span>
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
                <span>Proxy đã cấu hình</span>
                <span className="font-medium">
                  {stats.totalProxies}
                </span>
              </div>
              <Progress
                value={stats.totalProxies > 0 ? Math.min(100, stats.totalProxies * 10) : 0}
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Nhóm đã tạo</span>
                <span className="font-medium">
                  {stats.totalGroups}
                </span>
              </div>
              <Progress
                value={stats.totalGroups > 0 ? Math.min(100, stats.totalGroups * 10) : 0}
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
