import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@zigbolt/prisma";
import { permissionProcedure, router } from "../trpc";
import { UserPermissions } from "@zigbolt/shared";
import { paginationSchema } from "../utils/schemas";

export const membersRouter = router({
  list: permissionProcedure([UserPermissions["MEMBER:READ"]])
    .input(paginationSchema)
    .query(async ({ input, ctx }) => {
      const where: Prisma.MembershipWhereInput = { orgId: ctx.org.id };

      if (input.search) {
        where.User = {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
          ],
        };
      }

      const [members, total] = await Promise.all([
        ctx.prisma.membership.findMany({
          where,
          include: {
            User: true,
            Role: true,
          },
          take: input.take,
          skip: (input.page - 1) * input.take,
          orderBy: {
            User: { name: "asc" },
          },
        }),
        ctx.prisma.membership.count({ where }),
      ]);

      return { members, total };
    }),
  invite: permissionProcedure([UserPermissions["MEMBER:ADD"]])
    .input(
      z.object({
        name: z.string().trim().optional(),
        email: z.string().toLowerCase().email(),
        role: z.union([
          z.literal("owner"),
          z.object({ id: z.string().uuid() }),
        ]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Try fetching the user based on email to check if they exist
      const user = await ctx.prisma.user.upsert({
        where: { email: input.email },
        update: {},
        create: {
          email: input.email,
          name: input.name ?? input.email.split("@")[0],
          SensitiveInfo: {
            create: {},
          },
        },
        include: {
          // Fetch memberships of this org if any
          Memberships: {
            where: {
              orgId: ctx.org.id,
            },
          },
        },
      });

      if (user.Memberships.length > 0) {
        // Already a member, don't invite again
        return null;
      }

      if (input.role === "owner") {
        if (ctx.membership.roleType !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Must be an owner to invite another owner",
          });
        }
      } else {
        const role = await ctx.prisma.role.findUnique({
          where: { id: input.role.id },
        });

        if (role?.orgId !== ctx.org.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid role" });
        }
      }

      const membership = await ctx.prisma.membership.create({
        data: {
          userId: user.id,
          orgId: ctx.org.id,
          roleType: input.role === "owner" ? "owner" : "custom",
          roleId: input.role === "owner" ? null : input.role.id,
        },
        include: {
          User: true,
        },
      });

      return { membership };
    }),
  changeRole: permissionProcedure([UserPermissions["MEMBER:CHANGE-ROLE"]])
    .input(
      z.object({
        userId: z.string().uuid(),
        newRole: z.union([
          z.literal("owner"),
          z.object({ id: z.string().uuid() }),
        ]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const member = await ctx.prisma.membership.findUnique({
        where: {
          userId_orgId: {
            orgId: ctx.org.id,
            userId: input.userId,
          },
        },
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (input.newRole === "owner") {
        if (ctx.membership.roleType !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Must be an owner to invite another owner",
          });
        }
      } else {
        const role = await ctx.prisma.role.findUnique({
          where: { id: input.newRole.id },
        });

        if (role?.orgId !== ctx.org.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid role" });
        }
      }

      await ctx.prisma.membership.update({
        where: {
          userId_orgId: {
            orgId: ctx.org.id,
            userId: member.userId,
          },
        },
        data: {
          roleType: input.newRole === "owner" ? "owner" : "custom",
          roleId: input.newRole === "owner" ? null : input.newRole.id,
        },
      });
    }),
  remove: permissionProcedure([UserPermissions["MEMBER:REMOVE"]])
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const member = await ctx.prisma.membership.findUnique({
        where: {
          userId_orgId: {
            orgId: ctx.org.id,
            userId: input.userId,
          },
        },
      });

      if (!member) {
        // Assume already removed
        return null;
      }

      if (member.roleType === "owner") {
        if (ctx.membership.roleType !== "owner") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Must be an owner to remove another owner",
          });
        }
      }

      // Remove!
      await ctx.prisma.membership.delete({
        where: {
          userId_orgId: {
            orgId: ctx.org.id,
            userId: member.userId,
          },
        },
      });
    }),
});
