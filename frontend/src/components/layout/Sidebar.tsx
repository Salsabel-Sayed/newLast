import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAVIGATION, isNavGroup, type NavGroup } from "./navigation";

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const active = NAVIGATION.find((entry) => isNavGroup(entry) && groupContainsPath(entry, location.pathname));
    return active ? active.label : null;
  });

  useEffect(() => {
    const active = NAVIGATION.find((entry) => isNavGroup(entry) && groupContainsPath(entry, location.pathname));
    if (active) {
      setOpenGroup(active.label);
    }
  }, [location.pathname]);

  return (
    <aside className={`app-sidebar ${isOpen ? "app-sidebar-open" : ""}`}>
      <div className="app-sidebar-brand">
        <i className="bi bi-cup-hot-fill" />
        <span>سوسو داش</span>
      </div>

      <nav className="app-sidebar-nav">
        {NAVIGATION.map((entry) => {
          if (isNavGroup(entry)) {
            const expanded = openGroup === entry.label;
            const isActive = groupContainsPath(entry, location.pathname);
            return (
              <div key={entry.label} className="app-sidebar-group">
                <button
                  type="button"
                  className={`app-sidebar-link app-sidebar-group-toggle ${isActive ? "app-sidebar-link-active-group" : ""}`}
                  onClick={() => setOpenGroup(expanded ? null : entry.label)}
                  aria-expanded={expanded}
                >
                  <i className={`bi ${entry.icon}`} />
                  <span className="app-sidebar-label">{entry.label}</span>
                  <i className={`bi bi-chevron-down app-sidebar-chevron ${expanded ? "app-sidebar-chevron-open" : ""}`} />
                </button>
                {expanded && (
                  <div className="app-sidebar-subitems">
                    {entry.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onNavigate}
                        className={({ isActive: linkActive }) =>
                          `app-sidebar-link app-sidebar-sublink ${linkActive ? "app-sidebar-link-active" : ""}`
                        }
                      >
                        <i className={`bi ${item.icon}`} />
                        <span className="app-sidebar-label">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={entry.path}
              to={entry.path}
              end={entry.path === "/"}
              onClick={onNavigate}
              className={({ isActive }) => `app-sidebar-link ${isActive ? "app-sidebar-link-active" : ""}`}
            >
              <i className={`bi ${entry.icon}`} />
              <span className="app-sidebar-label">{entry.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
