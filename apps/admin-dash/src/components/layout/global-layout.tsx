import { useAppStore, useMobileMenuStore } from "@/store";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { Topbar } from "@/components/layout/topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { trpcRQ } from "@/lib/trpc";
import { TooltipProvider } from "@radix-ui/react-tooltip";

export function GlobalLayout({ children }: { children: ReactNode }) {
  const isLoggedIn = useAppStore((s) => !!s.user);

  const isOpen = useMobileMenuStore((s) => s.isOpen);
  const setOpen = useMobileMenuStore((s) => s.setOpen);

  // Dynamically set page title to server name
  const nameQuery = trpcRQ.settings.getPublic.useQuery({ keys: ["name"] });
  const name = nameQuery.data?.settings.get("name")?.value;
  useEffect(() => {
    if (name) window.document.title = name;
  }, [name]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="grid grid-cols-3 md:grid-cols-5">
        {isLoggedIn && (
          <>
            <Sidebar className="hidden md:block h-screen" />
            <Topbar className="fixed md:hidden w-screen" />
          </>
        )}

        <main
          className={cn(
            "col-span-3 h-screen overflow-y-scroll overflow-x-auto p-4 pt-16 md:pt-4",
            [isLoggedIn ? "md:col-span-4 md:border-l" : "md:col-span-5"],
          )}
        >
          {children}
        </main>
      </div>

      <Toaster />

      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="left">
          <Sidebar showLogo={false} className="h-full mt-4" />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
