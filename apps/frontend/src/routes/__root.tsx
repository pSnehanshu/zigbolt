import { lazy, Suspense } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { useAppStore } from "@/store";
import { unstable_batchedUpdates } from "react-dom";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      // Lazy load in development
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    )
  : () => null;

export const Route = createRootRoute({
  async beforeLoad() {
    // Here we try to fetch the user and the org and save in store

    // Get the store obj
    const store = useAppStore.getState();

    // Fetch current user and the org
    const requests = [
      // Only fetch if not in store
      store.org
        ? Promise.resolve(store.org)
        : trpc.org.lookup.query({ domain: window.location.hostname }),
      // Only fetch if not in store
      store.user ? Promise.resolve(store.user) : trpc.auth.whoAmI.query(),
    ] as const;

    // Run the fetch
    const results = await Promise.allSettled(requests);

    // If succesfully fetched, save in store
    if (results[0].status === "fulfilled") {
      const org = results[0].value;
      unstable_batchedUpdates(() => {
        store.setOrg(org);
      });
    }

    // If succesfully fetched, save in store
    if (results[1].status === "fulfilled") {
      const user = results[1].value;
      unstable_batchedUpdates(() => {
        store.setUser(user);
      });
    }
  },
  component: Root,
});

function Root() {
  const isLoggedIn = useAppStore((s) => !!(s.user?.id && s.org?.id));

  return (
    <>
      {/* {isLoggedIn && (
        <header>
          <div className="p-2 flex gap-2">
            <Link to="/" className="[&.active]:font-bold">
              Home
            </Link>
          </div>

          <Button onClick={handleLogout} isLoading={isLoggingOut}>
            Logout
          </Button>

          <hr />
        </header>
      )} */}

      <div className="grid grid-cols-3 md:grid-cols-5">
        {isLoggedIn && <Sidebar className="hidden md:block" />}

        <main className="col-span-3 md:col-span-4 md:border-l min-h-screen p-4">
          <Outlet />
        </main>
      </div>

      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>

      <Toaster />
    </>
  );
}
