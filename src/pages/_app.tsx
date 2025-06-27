import { BrowserUpdateDialog } from "@/components/browser-update-dialog";
import Sidebar from "@/components/layout/sidebar";
import SetupGuard from "@/components/setup-guard";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useBrowserUpdate } from "@/hooks/use-browser-update";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  const {
    hasUpdate,
    updateInfo,
    showDialog,
    isUpdating,
    performUpdate,
    dismissUpdate,
    setShowDialog
  } = useBrowserUpdate();

  return (
    <ThemeProvider defaultTheme="system">
      <div>
        <SetupGuard>
          <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            <Sidebar />
            <div className="flex flex-col">
              <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                <Component {...pageProps} />
              </main>
            </div>
          </div>
          
          {/* Browser Update Dialog */}
          <BrowserUpdateDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            updateInfo={updateInfo}
            onUpdate={performUpdate}
            isUpdating={isUpdating}
          />
          
          <Toaster />
        </SetupGuard>
      </div>
    </ThemeProvider>
  );
}
