
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { LockKeyhole } from "lucide-react";
import { axiosRequest } from "../../api/axiosRequest.js";
import styles from "./resetPassword.module.css";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must contain at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!token) {
      toast.error("Invalid password reset link");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosRequest(
        `/auth/reset-password/${token}`,
        { password },
        "POST",
        {},
        { skipLoader: true }
      );

      toast.success(
        response?.message || "Password reset successfully"
      );

      setPassword("");
      setConfirmPassword("");

      navigate("/login");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <div className={styles.iconWrapper}>
          <LockKeyhole size={26} />
        </div>

        <h1 className={styles.title}>Reset Password</h1>

        <p className={styles.subtitle}>
          Enter your new password below to securely reset
          your IssueTracker account.
        </p>

        <form
          className={styles.form}
          onSubmit={handleResetPassword}
        >
          <div className={styles.inputGroup}>
            <label
              htmlFor="newPassword"
              className={styles.label}
            >
              New Password
            </label>

            <input
              id="newPassword"
              className={styles.input}
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.inputGroup}>
            <label
              htmlFor="confirmPassword"
              className={styles.label}
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              className={styles.input}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading
              ? "Resetting Password..."
              : "Reset Password"}
          </button>
        </form>

        <Link
          to="/login"
          className={styles.backLink}
        >
          Back to Sign In
        </Link>
      </section>
    </main>
  );
}
