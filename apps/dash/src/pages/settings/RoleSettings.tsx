import { Fragment, ReactNode, useMemo, useState } from "react";
import { useDebounce } from "usehooks-ts";
import { format } from "date-fns";
import ReactPaginate from "react-paginate";
import {
  PermissionDescriptions,
  UserPermissions,
  permissionSchema,
} from "@zigbolt/shared";
import { PiCaretLeft, PiCaretRight } from "react-icons/pi";
import { LuPen } from "react-icons/lu";
import { HiUserPlus } from "react-icons/hi2";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import { RouterOutputs, trpc } from "../../utils/trpc";
import { Button } from "../../components/elements/button";
import { Modal } from "../../components/elements/modal";
import toast from "react-hot-toast";
import { usePermissions } from "../../store";
import { Menu, Transition } from "@headlessui/react";
import { RoleForm, RoleFormValues } from "../../components/RoleForm";

type RoleType = RouterOutputs["roles"]["list"]["roles"] extends Map<
  string,
  infer I
>
  ? I
  : never;

type MenuItem = {
  title: string;
  icon: ReactNode;
  onClick?: (role: RoleType) => void;
};

export default function RoleSettingsPage() {
  const permissions = usePermissions();

  const [pageNum, setPageNum] = useState(1);
  const [itemsPerPage] = useState(20);

  const [_search, setSearch] = useState("");
  const search = useDebounce(_search, 500);

  const rolesQuery = trpc.roles.list.useQuery({
    page: pageNum,
    take: itemsPerPage,
    search,
  });
  const createRoleMutation = trpc.roles.create.useMutation();
  const updateRoleMutation = trpc.roles.update.useMutation();
  const deleteRoleMutation = trpc.roles.delete.useMutation();

  const itemsReceived = rolesQuery.data?.roles.size ?? 0;
  const startSN = itemsReceived > 0 ? (pageNum - 1) * itemsPerPage + 1 : 0;
  const total = rolesQuery.data?.total ?? 0;
  const endSN = itemsReceived > 0 ? startSN + total - 1 : 0;
  const pageCount = Math.ceil(itemsReceived / itemsPerPage);

  const [isRoleFormVisible, setRoleFormVisible] = useState(false);

  const [role2edit, setRole2edit] = useState<RoleType>();

  const formInitialValues = useMemo<RoleFormValues | undefined>(
    () =>
      role2edit
        ? {
            name: role2edit.name,
            permissions: permissionSchema
              .parse(role2edit.permissions)
              .map((perm) => UserPermissions[perm]),
          }
        : undefined,
    [role2edit],
  );

  const actions = useMemo<MenuItem[]>(() => {
    const actions: MenuItem[] = [];

    if (permissions.includes(UserPermissions["ROLE:WRITE"])) {
      actions.push({
        title: "Edit",
        icon: <LuPen className="mr-2 h-5 w-5" aria-hidden="true" />,
        onClick(role) {
          setRole2edit(role);
          setRoleFormVisible(true);
        },
      });
    }

    if (permissions.includes(UserPermissions["ROLE:DELETE"])) {
      actions.push({
        title: "Delete",
        icon: <MdDelete className="mr-2 h-5 w-5" aria-hidden="true" />,
        onClick(role) {
          if (
            confirm(
              `Are you sure you want to delete the ${role.name} role?
Deleting this role will render any members currently assigned to it role-less.
Consequently, they will lose access to the dashboard unless assigned another role.`,
            )
          ) {
            toast
              .promise(deleteRoleMutation.mutateAsync({ roleId: role.id }), {
                loading: "Deleting the role...",
                success: "Role deleted successfully",
                error: "Failed to delete role!",
              })
              .then(() => rolesQuery.refetch());
          }
        },
      });
    }

    return actions;
  }, [deleteRoleMutation, permissions, rolesQuery]);

  return (
    <section className="lg:ml-8">
      <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
        Roles
      </h2>

      <div className="bg-white dark:bg-gray-800 sm:rounded-lg">
        <div className="flex flex-col-reverse lg:flex-row items-end lg:items-center justify-between relative w-full mb-2">
          <div className="w-full max-w-xl flex space-x-2">
            <input
              type="text"
              className="w-full p-2 pl-4 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
              placeholder="Search"
              value={_search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {rolesQuery.isLoading && (
              <div role="status" className="translate-y-0.5">
                <svg
                  aria-hidden="true"
                  className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            )}
          </div>

          {permissions.includes(UserPermissions["ROLE:WRITE"]) && (
            <Button
              label="Create role"
              type="button"
              className="mb-2 lg:mb-0 lg:ml-2"
              icon={<HiUserPlus className="mr-2 text-lg" />}
              onClick={() => {
                setRole2edit(undefined);
                setRoleFormVisible(true);
              }}
            />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Name
                </th>
                <th scope="col" className="px-4 py-3">
                  Permissions
                </th>
                <th scope="col" className="px-4 py-3">
                  Created at
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rolesQuery.data?.roles &&
                Array.from(rolesQuery.data?.roles).map(([, role]) => {
                  const permParsed = permissionSchema.safeParse(
                    role.permissions,
                  );
                  const permissions = permParsed.success
                    ? permParsed.data
                    : null;
                  const permissionNames = permissions?.map(
                    (p) => [p, UserPermissions[p]] as const,
                  );

                  return (
                    <tr
                      key={role.id}
                      className="border-b dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <th
                        scope="row"
                        className="flex items-center px-4 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                      >
                        {role.name}
                      </th>
                      <td className="max-w-xl">
                        <div className="flex flex-wrap px-4 py-2 w-full">
                          {permissionNames?.map(([p, pname]) => (
                            <div
                              key={pname}
                              title={PermissionDescriptions[p]}
                              className="bg-blue-100 cursor-help my-2 text-blue-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-blue-400 border border-blue-400"
                            >
                              {pname}
                            </div>
                          )) ?? "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                        {format(role.createdAt, "do LLL yyy, hh:mm aaa")}
                      </td>
                      <td>
                        {actions.length > 0 && (
                          <Menu
                            as="div"
                            className="relative inline-block text-left"
                          >
                            <div>
                              <Menu.Button className="text-violet-200 hover:text-violet-100 p-2 my-1 border border-transparent hover:border-gray-400 hover:bg-gray-500 rounded-full">
                                <HiOutlineDotsVertical
                                  aria-hidden="true"
                                  className="text-2xl h-5 w-5 "
                                />
                              </Menu.Button>
                            </div>

                            <Transition
                              as={Fragment}
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items className="z-10 absolute right-0 mt-0 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                                <div className="p-1">
                                  {actions.map((act) => (
                                    <Menu.Item key={act.title}>
                                      {({ active }) => (
                                        <button
                                          className={`${
                                            active
                                              ? "bg-violet-500 text-white"
                                              : "text-gray-900"
                                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                          onClick={() => act.onClick?.(role)}
                                        >
                                          {act.icon}
                                          {act.title}
                                        </button>
                                      )}
                                    </Menu.Item>
                                  ))}
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <nav
          className="flex flex-col items-start justify-between p-4 space-y-3 md:flex-row md:items-center md:space-y-0"
          aria-label="Table navigation"
        >
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            Showing
            <span className="font-semibold text-gray-900 dark:text-white mx-1">
              {startSN} &ndash; {endSN}
            </span>
            of
            <span className="font-semibold text-gray-900 dark:text-white mx-1">
              {total}
            </span>
          </span>

          <ReactPaginate
            className="inline-flex items-stretch -space-x-px"
            disabledLinkClassName="cursor-not-allowed"
            pageLinkClassName="flex items-center justify-center px-3 py-2 text-sm leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            previousLinkClassName="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            nextLinkClassName="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            activeLinkClassName="underline"
            breakLinkClassName="flex items-center justify-center px-3 py-2 text-sm leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            previousLabel={<PiCaretLeft />}
            nextLabel={<PiCaretRight />}
            renderOnZeroPageCount={null}
            pageCount={pageCount}
            onPageChange={({ selected }) => setPageNum(selected + 1)}
          />
        </nav>
      </div>

      <Modal
        visible={isRoleFormVisible}
        title={formInitialValues ? "Update role" : "Create new role"}
        onCloseAttempt={() => {
          setRole2edit(undefined);
          setRoleFormVisible(false);
        }}
      >
        <RoleForm
          onSubmit={async (values) => {
            if (role2edit) {
              // Edit
              await updateRoleMutation.mutateAsync({
                roleId: role2edit.id,
                name: values.name,
                permissions: values.permissions.map(
                  (pn) => UserPermissions[pn as keyof typeof UserPermissions],
                ),
              });
            } else {
              // Create new
              await createRoleMutation.mutateAsync({
                name: values.name,
                permissions: values.permissions.map(
                  (p) => UserPermissions[p as keyof typeof UserPermissions],
                ),
              });
            }

            rolesQuery.refetch();
            setRoleFormVisible(false);
            setRole2edit(undefined);

            toast.success(`Role ${values.name} created!`);
          }}
          initialValues={formInitialValues}
        />
      </Modal>
    </section>
  );
}
