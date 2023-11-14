import classNames from "classnames";
import { ReactNode, useMemo, useState } from "react";
import {
  NavLink,
  Redirect,
  Route,
  Switch,
  useRouteMatch,
} from "react-router-dom";
import { FaUsers, FaBuildingColumns, FaUserTag } from "react-icons/fa6";
import OrgSettingsPage from "./OrgSettings";
import MemberSettingsPage from "./MemberSettings";
import RoleSettingsPage from "./RoleSettings";

type MenuItem = {
  title: string;
  icon?: ReactNode;
  link: string;
};

export default function SettingsPage() {
  const match = useRouteMatch();
  const [navVisible, setNavVisible] = useState(true);

  const menu = useMemo<MenuItem[]>(
    () => [
      {
        title: "Organization",
        link: `${match.url}/org`,
        icon: <FaBuildingColumns />,
      },
      {
        title: "Members",
        link: `${match.url}/members`,
        icon: <FaUsers />,
      },
      {
        title: "Roles",
        link: `${match.url}/roles`,
        icon: <FaUserTag />,
      },
    ],
    [match.url],
  );

  return (
    <div className="flex flex-col lg:flex-row bg-white dark:bg-gray-800 rounded-xl">
      <button
        onClick={() => setNavVisible((v) => !v)}
        className="lg:hidden p-4"
      >
        {navVisible ? "Close" : "Open"} menu
      </button>

      <aside
        className={classNames(
          navVisible ? "visible" : "hidden",
          "w-full lg:w-1/4 xl:w-64 p-2 lg:border-r-2 border-gray-200 dark:border-gray-700",
        )}
      >
        <ul className="space-y-2">
          {menu.map((item, i) => (
            <li key={i}>
              <NavLink
                to={item.link}
                activeClassName="bg-gray-100 dark:bg-gray-700"
                className="flex items-center p-2 text-base font-medium text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                {item.icon}

                <span className="ml-3">{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      <div className="border-t-2 lg:border-0 border-gray-200 dark:border-gray-700 lg:flex-grow p-4 py-8">
        <Switch>
          <Route path={`${match.url}/org`} component={OrgSettingsPage} />
          <Route path={`${match.url}/members`} component={MemberSettingsPage} />
          <Route path={`${match.url}/roles`} component={RoleSettingsPage} />
          <Route path="/">
            <Redirect to={menu.at(0)?.link ?? "/"} />
          </Route>
        </Switch>
      </div>
    </div>
  );
}
