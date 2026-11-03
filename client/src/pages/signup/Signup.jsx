import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { axiosRequest } from "../../api/axiosRequest";
import styles from "./signup.module.css";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");
    setLoading(true);
    try {
      await axiosRequest(
        "/auth/signup",
        {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        },
        "POST",
        { "Content-Type": "application/json" },
      );
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brand}>◆ IssueTracker</div>
        <div>
          <p className={styles.eyebrow}>YOUR TEAM, IN SYNC</p>
          <h1>Better teamwork starts here.</h1>
          <p>
            Create your account to stay on top of assigned issues and team
            updates.
          </p>
        </div>
        <p className={styles.brandFooter}>Organize. Assign. Resolve.</p>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.mobileBrand}>◆ IssueTracker</div>
          <h2>Create your account</h2>
          <p className={styles.subtitle}>Join your team on IssueTracker.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              placeholder="Your full name"
              autoComplete="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <label htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <label htmlFor="signup-password">Password</label>
            <div className={styles.passwordWrap}>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
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
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <button className={styles.submit} disabled={loading} type="submit">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          <p className={styles.bottomText}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
