import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
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
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    dispatch({ type: NOT_AUTHENTICATED });
    navigate("/login", { replace: true });
  };

  const getNavClassName = (page) =>
    `${styles.navLink}${activePage === page ? ` ${styles.activeNav}` : ""}`;

  return (
    <aside className={styles.sidebar}>
      <Link
        className={styles.brand}
        to={isAdmin ? "/admin/dashboard" : "/employee/dashboard"}
        aria-label="IssueTracker dashboard"
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
            >
              <span className={styles.navIcon}>{icon}</span>
              {label}
            </Link>
          ) : (
            <a
              className={getNavClassName(key)}
              href={href}
              key={key}
            >
              <span className={styles.navIcon}>{icon}</span>
              {label}
            </a>
          ),
        )}
      </nav>

      <div className={styles.sidebarBottom}>
        {isAdmin && (
          <a className={styles.navLink} href="#dashboard">
            <span className={styles.navIcon}>⚙</span>
            Settings
          </a>
        )}
        <button className={styles.navLink} type="button" onClick={handleLogout}>
          <span className={styles.navIcon}>↪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
