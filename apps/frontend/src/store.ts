import { useMemo } from "react";
import { create } from "zustand";
import { RouterOutputs, trpc } from "@/lib/trpc";
import {
  AllPermissions,
  UserPermissions,
  permissionSchema,
} from "@zigbolt/shared";

type Org = RouterOutputs["org"]["lookup"];
type User = RouterOutputs["auth"]["whoAmI"];

type AppStore = {
  user: User | null;
  setUser: (user: User) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  org: Org | null;
  setOrg: (org: Org) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  /// Auth related states

  user: null,

  setUser: (user) => set(() => ({ user })),

  async login(email, password) {
    // Do login
    await trpc.auth.login.mutate({ email, password });

    // Fetch current user
    const user = await trpc.auth.whoAmI.query();

    // Save in state
    set(() => ({ user }));
  },

  logout: async () => {
    // Do logout
    await trpc.auth.logout.mutate();

    // Remove user from state
    set(() => ({ user: null }));
  },

  /// Org related states

  org: null,

  setOrg: (org) => set(() => ({ org })),

  /// Others
}));

/** Get all the permissions this user has on this org */
export function usePermissions(): UserPermissions[] {
  const membership = useAppStore((s) =>
    s.user?.Memberships.find((m) => m.orgId === s.org?.id),
  );

  const permissions = useMemo<UserPermissions[]>(() => {
    if (membership?.roleType === "owner") {
      // Owners have all the permissions
      return AllPermissions;
    }

    // Parse and return
    const perms = permissionSchema.safeParse(membership?.Role?.permissions);

    // Check if success or failure
    return perms.success ? perms.data : [];
  }, [membership?.Role?.permissions, membership?.roleType]);

  return permissions;
}