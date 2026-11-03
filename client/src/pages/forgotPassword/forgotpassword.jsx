
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import styles from "./forgotPassword.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/forgot-password`,
        { email: trimmedEmail }
      );

      setEmailSent(true);
      toast.success(response.data.message || "Reset link sent successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>IT</div>

        {!emailSent ? (
          <>
            <h1>Forgot Password?</h1>
            <p className={styles.description}>
              No worries! Enter your registered email address and
              we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="reset-email">Email Address</label>

              <input
                id="reset-email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h1>Check Your Email</h1>
            <p className={styles.description}>
              If an account exists for <strong>{email}</strong>,
              you'll receive a password reset link shortly.
            </p>

            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className={styles.resendButton}
            >
              Try another email
            </button>
          </div>
        )}

        <Link to="/login" className={styles.backLink}>
          ← Back to Sign In
        </Link>
      </div>
    </main>
  );
}
