import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { axiosRequest } from "../../api/axiosRequest";
import {
  AUTHENTICATED,
  SET_ACCESSTOKEN,
} from "../../actions/controlActionTypes";
import styles from "./login.module.css";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await axiosRequest(
        "/auth/login",
        {
          email: form.email.trim(),
          password: form.password,
        },
        "POST",
        { "Content-Type": "application/json" }
      );

      const token = result?.data ?? result?.token ?? "";
      if (!token) throw new Error("Login failed: no token returned");

      dispatch({ type: SET_ACCESSTOKEN, payload: token });
      localStorage.setItem("accessToken", token);
      localStorage.setItem("role", result.role || "employee");
      if (result.user?.id || result.user?._id) {
        localStorage.setItem("userId", result.user.id || result.user._id);
      }
      if (result.user?.name) {
        localStorage.setItem("userName", result.user.name);
      }
      dispatch({
        type: AUTHENTICATED,
        payload: {
          ...result.user,
          id: result.user?.id || result.user?._id,
          role: result.role || "employee",
        },
      });
      navigate(
        result.role === "admin" ? "/admin/dashboard" : "/employee/dashboard",
        { replace: true },
      );
    } catch (err) {
      if (err.response?.status === 400) {
        toast.error("Invalid credentials");
      } else {
        toast.error(
          err.response?.data?.message || "Unable to sign in. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brand}>◆ IssueTracker</div>
        <div>
          <p className={styles.eyebrow}>WORK SMARTER, TOGETHER</p>
          <h1>Keep every issue on track.</h1>
          <p>
            Manage tasks, follow progress, and collaborate with your team in one
            simple workspace.
          </p>
        </div>
        <p className={styles.brandFooter}>Organize. Assign. Resolve.</p>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.mobileBrand}>◆ IssueTracker</div>
          <h2>Welcome back</h2>
          <p className={styles.subtitle}>
            Sign in to continue to your workspace.
          </p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <div className={styles.labelRow}>
              <label htmlFor="login-password">Password</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <div className={styles.passwordWrap}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button className={styles.submit} disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className={styles.bottomText}>
            New to IssueTracker? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
