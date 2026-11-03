import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { axiosRequest } from "../../api/axiosRequest";
import UserDropdown from "../userDropdown/userDropdown";
import {
  AUTHENTICATED,
  SET_ACCESSTOKEN,
} from "../../actions/controlActionTypes";
import dashboardStyles from "../admin_dashboard/admin_dashboard.module.css";
import styles from "./employee_profile.module.css";

const emptyProfile = {
  id: "",
  name: "",
  email: "",
  role: "Employee",
  phone: "",
  designation: "",
  avatar: "",
  createdAt: "",
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const tabs = [
  { id: "personal", label: "Personal Info", icon: "♙" },
  { id: "password", label: "Change Password", icon: "▣" },
  { id: "account", label: "Account Details", icon: "ⓘ" },
];

// The component is exported through Redux connect below.
// eslint-disable-next-line react-refresh/only-export-components
function EmployeeProfile({
  loggedInUser,
  authenticated,
  set_accessToken,
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const profile = loggedInUser || emptyProfile;
  const [form, setForm] = useState({ name: "", phone: "", designation: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const requestedTab = searchParams.get("tab");
  const activeTab = tabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "personal";
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem("accessToken");
    if (!storedAccessToken) {
      navigate("/login", { replace: true });
      return undefined;
    }

    set_accessToken(storedAccessToken);
    let active = true;
    axiosRequest("/auth/profile")
      .then((response) => {
        if (!active) return;
        const user = response.data || emptyProfile;
        authenticated({ ...user, id: user.id || user._id });
        setForm({
          name: user.name || "",
          phone: user.phone || "",
          designation: user.designation || "",
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load your profile. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authenticated, navigate, set_accessToken]);

  const changed =
    form.name !== (profile.name || "") ||
    form.phone !== (profile.phone || "") ||
    form.designation !== (profile.designation || "") ||
    Boolean(avatarFile);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("phone", form.phone.trim());
    payload.append("designation", form.designation.trim());
    if (avatarFile) payload.append("avatar", avatarFile);

    try {
      const response = await axiosRequest("/auth/profile", payload, "PUT");
      const updatedProfile = response.data;
      authenticated({
        ...updatedProfile,
        id: updatedProfile.id || updatedProfile._id,
      });
      setForm({
        name: updatedProfile.name || "",
        phone: updatedProfile.phone || "",
        designation: updatedProfile.designation || "",
      });
      setAvatarFile(null);
      setAvatarPreview("");
      localStorage.setItem("userName", updatedProfile.name);
      setNotice("Your profile has been updated.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setSaving(true);
    try {
      const response = await axiosRequest(
        "/auth/profile/password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        "PUT",
        { "Content-Type": "application/json" },
      );
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setNotice(response.message || "Password changed successfully.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not change your password. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: profile.name || "",
      phone: profile.phone || "",
      designation: profile.designation || "",
    });
    setAvatarFile(null);
    setAvatarPreview("");
    setError("");
    setNotice("");
  };

  const displayName = profile.name || localStorage.getItem("userName") || "Employee";
  const roleLabel =
    (profile.role || localStorage.getItem("role"))?.toLowerCase() === "admin"
      ? "Admin"
      : "Employee";
  const avatarSource = avatarPreview || profile.avatar;

  return (
    <section className={`${dashboardStyles.mainContent} ${styles.mainContent}`}>
      <header className={dashboardStyles.topbar}>
        <div className={dashboardStyles.mobileBrand}>
          <span className={dashboardStyles.brandMark}>◆</span>
          IssueTracker
        </div>
        <div className={dashboardStyles.topbarSpacer} />
        <UserDropdown />
      </header>

      <div className={`${dashboardStyles.dashboardBody} ${styles.profileBody}`}>
        <div className={styles.pageHeading}>
          <h1>My Profile</h1>
          <p>View and update your personal information.</p>
        </div>

        {error && <div className={styles.messageError} role="alert">{error}</div>}
        {notice && <div className={styles.messageSuccess} role="status">{notice}</div>}

        <div className={styles.profileLayout}>
          <aside className={styles.summaryCard} aria-label="Profile summary">
            <div className={styles.avatarWrap}>
              {avatarSource ? (
                <img className={styles.profileAvatar} src={avatarSource} alt={`${displayName}'s profile`} />
              ) : (
                <span className={styles.profileAvatarFallback} aria-label={`${displayName}'s initials`}>
                  {getInitials(displayName)}
                </span>
              )}
              <label className={styles.avatarUpload} title="Change profile photo">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload profile photo"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setError("Profile photo must be 5 MB or smaller.");
                      event.target.value = "";
                      return;
                    }
                    setError("");
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }}
                />
                <span aria-hidden="true">▣</span>
              </label>
            </div>
            <h2>{loading ? "Loading profile…" : displayName}</h2>
            <p className={styles.designationSummary}>
              {profile.designation || roleLabel}
            </p>
            <span className={styles.roleBadge}>{roleLabel}</span>
            <div className={styles.summaryDivider} />
            <p className={styles.summaryDetail}>
              <span aria-hidden="true">✉</span>
              {profile.email || "Email unavailable"}
            </p>
            <p className={styles.summaryDetail}>
              <span aria-hidden="true">☎</span>
              {profile.phone || "Phone not added"}
            </p>
            <p className={styles.summaryDetail}>
              <span aria-hidden="true">▦</span>
              Joined {formatDate(profile.createdAt)}
            </p>
          </aside>

          <section className={styles.detailsCard}>
            <div className={styles.tabs} role="tablist" aria-label="Profile sections">
              {tabs.map((tab) => (
                <button
                  className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ""}`}
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => {
                    setSearchParams(
                      tab.id === "personal" ? {} : { tab: tab.id },
                      { replace: true },
                    );
                    setError("");
                    setNotice("");
                  }}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "personal" && (
              <form className={styles.tabContent} onSubmit={handleProfileSave}>
                <div className={styles.sectionHeading}>
                  <h2>Personal Information</h2>
                  <p>Update your basic details.</p>
                </div>
                {loading ? (
                  <p className={styles.loadingMessage}>Loading profile…</p>
                ) : (
                  <>
                    <div className={styles.formGrid}>
                      <label className={styles.field}>
                        <span>Full Name <b>*</b></span>
                        <input
                          autoComplete="name"
                          maxLength={100}
                          required
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Email Address</span>
                        <input type="email" value={profile.email} readOnly />
                      </label>
                      <label className={styles.field}>
                        <span>Phone Number</span>
                        <input
                          autoComplete="tel"
                          maxLength={30}
                          value={form.phone}
                          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                        />
                      </label>
                      <label className={styles.field}>
                        <span>Designation</span>
                        <input
                          maxLength={80}
                          value={form.designation}
                          onChange={(event) => setForm((current) => ({ ...current, designation: event.target.value }))}
                        />
                      </label>
                    </div>
                    <div className={styles.formActions}>
                      <button className={styles.cancelButton} type="button" onClick={handleCancel} disabled={!changed || saving}>
                        Cancel
                      </button>
                      <button className={styles.primaryButton} type="submit" disabled={!changed || saving}>
                        {saving ? "Saving…" : "✎　Update Profile"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {activeTab === "password" && (
              <form className={styles.tabContent} onSubmit={handlePasswordSave}>
                <div className={styles.sectionHeading}>
                  <h2>Change Password</h2>
                  <p>Choose a strong password you do not use elsewhere.</p>
                </div>
                <div className={styles.passwordFields}>
                  <label className={styles.field}>
                    <span>Current Password <b>*</b></span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>New Password <b>*</b></span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={passwordForm.newPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Confirm New Password <b>*</b></span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    />
                  </label>
                </div>
                <div className={styles.formActions}>
                  <button
                    className={styles.primaryButton}
                    type="submit"
                    disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  >
                    {saving ? "Saving…" : "Update Password"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "account" && (
              <div className={styles.tabContent}>
                <div className={styles.sectionHeading}>
                  <h2>Account Details</h2>
                  <p>Information about your IssueTracker account.</p>
                </div>
                {loading ? (
                  <p className={styles.loadingMessage}>Loading account…</p>
                ) : (
                  <dl className={styles.accountDetails}>
                    <div><dt>Account name</dt><dd>{profile.name || "—"}</dd></div>
                    <div><dt>Email address</dt><dd>{profile.email || "—"}</dd></div>
                    <div><dt>Account type</dt><dd>{roleLabel}</dd></div>
                    <div><dt>Designation</dt><dd>{profile.designation || "Not set"}</dd></div>
                    <div><dt>Member since</dt><dd>{formatDate(profile.createdAt)}</dd></div>
                    <div><dt>Account ID</dt><dd className={styles.accountId}>{profile.id || profile._id || "—"}</dd></div>
                  </dl>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

const mapStateToProps = (state) => ({
  loggedInUser: state.control.loggedInUser,
});

const mapDispatchToProps = {
  authenticated: (details) => ({
    type: AUTHENTICATED,
    payload: details,
  }),
  set_accessToken: (token) => ({
    type: SET_ACCESSTOKEN,
    payload: token,
  }),
};

export default connect(mapStateToProps, mapDispatchToProps)(EmployeeProfile);