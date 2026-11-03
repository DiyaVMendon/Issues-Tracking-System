import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import AdminDashboard from "./pages/admin_dashboard/adminDashboard.jsx";
import AdminIssues from "./pages/admin_issue/AdminIssues.jsx";
import EmployeeDashboard from "./pages/employee_dashboard/EmployeeDashboard.jsx";
import EmployeeIssues from "./pages/employee_issues/Employee_issues.jsx";
import EmployeeProfile from "./pages/profile/EmployeeProfile.jsx";
import Login from "./pages/login/Login.jsx";
import SignUp from "./pages/signup/Signup.jsx";
import Sidebar from "./Sidebar.jsx";
import dashboardStyles from "./pages/admin_dashboard/admin_dashboard.module.css";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import "./App.css";

const GlobalLoader = () => {
  const isLoading = useSelector(
    (state) => state.control.pendingRequests > 0,
  );
  if (!isLoading) return null;

  return (
    <div className="globalLoaderOverlay" role="status" aria-live="polite">
      <span className="globalLoaderSpinner" aria-hidden="true" />
      <span className="globalLoaderLabel">Loading…</span>
    </div>
  );
};

const DashboardLayout = () => (
  <main className={dashboardStyles.appShell}>
    <Sidebar />
    <Outlet />
  </main>
);

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <SignUp /> },
  {
    element: <DashboardLayout />,
    children: [
      { path: "/admin/dashboard", element: <AdminDashboard /> },
      { path: "/admin/issues", element: <AdminIssues /> },
      { path: "/employee/dashboard", element: <EmployeeDashboard /> },
      { path: "/employee/issues", element: <EmployeeIssues /> },
      { path: "/employee/profile", element: <EmployeeProfile /> },
    ],
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <GlobalLoader />
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
