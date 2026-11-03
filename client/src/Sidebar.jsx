import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeDialog } from "./pages/userDropdown/userDropdown";
import {
  NOT_AUTHENTICATED,
} from "./actions/controlActionTypes";
import styles from "./pages/admin_dashboard/admin_dashboard.module.css";

const employeeLinks = [
  { label: "Dashboard", icon: "▦", to: "/employee/dashboard", key: "dashboard" },
  { label: "My Issues", icon: "▤", to: "/employee/issues", key: "issues" },
  { label: "Profile", icon: "♙", to: "/employee/profile", key: "profile" },
];

const adminLinks = [
  { label: "Dashboard", icon: "▦", to: "/admin/dashboard", key: "dashboard" },
  { label: "All Issues", icon: "▤", to: "/admin/issues", key: "issues" },
  { label: "Users", icon: "♙", to: "/admin/users", key: "users" },
  { label: "Profile", icon: "♙", to: "/admin/profile", key: "profile" },
];

export default function Sidebar({ theme, setTheme }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const role = localStorage.getItem("role")?.toLowerCase() || "employee";
  const isAdmin = role === "admin";
  const links = isAdmin ? adminLinks : employeeLinks;
  const activePage = pathname.endsWith("/issues")
    ? "issues"
    : pathname.endsWith("/users")
      ? "users"
      : pathname.endsWith("/profile") || hash === "#profile"
        ? "profile"
        : hash === "#status-breakdown"
          ? "reports"
          : hash === "#recent-issues"
            ? "issues"
            : "dashboard";

  const handleLogout = () => {
    setMobileNavOpen(false);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    dispatch({ type: NOT_AUTHENTICATED });
    navigate("/login", { replace: true });
  };

  const getNavClassName = (page) =>
    `${styles.navLink}${activePage === page ? ` ${styles.activeNav}` : ""}`;

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      {!mobileNavOpen && (
        <button
          className={styles.sidebarToggle}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={false}
          aria-controls="app-navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
      )}
      {mobileNavOpen && (
        <button
          className={styles.sidebarBackdrop}
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={`${styles.sidebar}${mobileNavOpen ? ` ${styles.sidebarOpen}` : ""}`}
        id="app-navigation"
      >
        <Link
          className={styles.brand}
          to={isAdmin ? "/admin/dashboard" : "/employee/dashboard"}
          aria-label="IssueTracker dashboard"
          onClick={() => setMobileNavOpen(false)}
        >
          <span className={styles.brandMark}>◆</span>
          <span>IssueTracker</span>
        </Link>

        <div className={styles.navSectionLabel}>{isAdmin ? "ADMIN" : "EMPLOYEE"}</div>
        <nav
          className={styles.navigation}
          aria-label={`${isAdmin ? "Admin" : "Employee"} navigation`}
        >
          {links.map(({ label, icon, to, href, key }) =>
            to ? (
              <Link
                className={getNavClassName(key)}
                key={key}
                to={to}
                onClick={() => setMobileNavOpen(false)}
              >
                <span className={styles.navIcon}>{icon}</span>
                {label}
              </Link>
            ) : (
              <a
                className={getNavClassName(key)}
                href={href}
                key={key}
                onClick={() => setMobileNavOpen(false)}
              >
                <span className={styles.navIcon}>{icon}</span>
                {label}
              </a>
            ),
          )}
        </nav>

        <div className={styles.sidebarBottom}>
          {isAdmin && (
            <button
              className={styles.navLink}
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                setThemeDialogOpen(true);
              }}
            >
              <span className={styles.navIcon}>⚙</span>
              Settings
            </button>
          )}
          <button
            className={styles.navLink}
            type="button"
            onClick={handleLogout}
          >
            <span className={styles.navIcon}>↪</span>
            Logout
          </button>
        </div>
      </aside>
      {themeDialogOpen && (
        <ThemeDialog
          theme={theme}
          setTheme={setTheme}
          onClose={() => setThemeDialogOpen(false)}
        />
      )}
    </>
  );
}
