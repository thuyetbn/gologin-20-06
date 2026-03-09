import { BrowserUpdateDialog } from "@/components/browser-update-dialog";
import { ErrorBoundary } from "@/components/error-boundary";
import Sidebar from "@/components/layout/sidebar";
import SetupGuard from "@/components/setup-guard";
import { ThemeProvider } from "@/components/theme-provider";
import { CachedDataProvider } from "@/hooks/use-cached-data";
import { useBrowserUpdate } from "@/hooks/use-browser-update";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster as SonnerToaster } from "sonner";

export default function App({ Component, pageProps }: AppProps) {
  const {
    updateInfo,
    showDialog,
    isUpdating,
    performUpdate,
    setShowDialog
  } = useBrowserUpdate();

  return (
    <ThemeProvider defaultTheme="system">
      <ErrorBoundary>
        <div>
          <SetupGuard>
            <CachedDataProvider>
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

            <SonnerToaster position="bottom-right" richColors />
            </CachedDataProvider>
          </SetupGuard>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
