import {
  Component,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import AdminDashboard from "./pages/admin_dashboard/adminDashboard.jsx";
import AdminIssues from "./pages/admin_issue/AdminIssues.jsx";
import AdminUsers from "./pages/admin_users/AdminUsers.jsx";
import EmployeeDashboard from "./pages/employee_dashboard/EmployeeDashboard.jsx";
import EmployeeIssues from "./pages/employee_issues/Employee_issues.jsx";
import EmployeeProfile from "./pages/profile/EmployeeProfile.jsx";
import ForgotPassword from "./pages/forgotPassword/forgotpassword.jsx";
import ResetPassword from "./pages/resetPassword/resetPassword.jsx";
import Login from "./pages/login/Login.jsx";
import SignUp from "./pages/signup/Signup.jsx";
import Sidebar from "./Sidebar.jsx";
import dashboardStyles from "./pages/admin_dashboard/admin_dashboard.module.css";
import { ToastContainer } from "react-toastify";
import "./App.css";

const RecoveryPage = ({ title, message, showReload = false }) => (
  <main className="appRecoveryPage">
    <section className="appRecoveryCard" aria-labelledby="app-recovery-title">
      <span className="appRecoveryCode">{showReload ? "Oops" : "404"}</span>
      <h1 id="app-recovery-title">{title}</h1>
      <p>{message}</p>
      <div className="appRecoveryActions">
        <a href="/login">Back to sign in</a>
        {showReload && (
          <button type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        )}
      </div>
    </section>
  </main>
);

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <RecoveryPage
          title="Something went wrong"
          message="The app ran into an unexpected problem. Reload the page to try again."
          showReload
        />
      );
    }

    return this.props.children;
  }
}

const ThemeContext = createContext(null);

const DashboardLayout = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <main
      className={dashboardStyles.appShell}
      data-app-shell
      data-theme={theme}
    >
      <Sidebar theme={theme} setTheme={setTheme} />
      <Outlet context={{ theme, setTheme }} />
    </main>
  );
};

const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: (
      <RecoveryPage
        title="Something went wrong"
        message="The app ran into an unexpected problem. Reload the page to try again."
        showReload
      />
    ),
    children: [
      { path: "/", element: <Login /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <SignUp /> },

      { path: "/forgot-password", element: <ForgotPassword /> },
      {
        path: "/reset-password/:token",
        element: <ResetPassword />,
      },
      {
        element: <DashboardLayout />,
        children: [
          { path: "/admin/dashboard", element: <AdminDashboard /> },
          { path: "/admin/issues", element: <AdminIssues /> },
          { path: "/admin/users", element: <AdminUsers /> },
          { path: "/admin/profile", element: <EmployeeProfile /> },
          { path: "/employee/dashboard", element: <EmployeeDashboard /> },
          { path: "/employee/issues", element: <EmployeeIssues /> },
          { path: "/employee/profile", element: <EmployeeProfile /> },
        ],
      },
      {
        path: "*",
        element: (
          <RecoveryPage
            title="Page not found"
            message="The page you're looking for doesn't exist or may have moved."
          />
        ),
      },
    ],
  },
]);

export default function App() {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem("theme") || "light",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = (nextTheme) => {
    localStorage.setItem("theme", nextTheme);
    setThemeState(nextTheme);
  };
  return (
    <>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <AppErrorBoundary>
          <RouterProvider router={router} />
        </AppErrorBoundary>
      </ThemeContext.Provider>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </>
  );
}
