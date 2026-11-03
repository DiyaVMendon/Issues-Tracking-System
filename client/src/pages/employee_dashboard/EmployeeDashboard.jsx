import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosRequest } from "../../api/axiosRequest";
import styles from "../admin_dashboard/admin_dashboard.module.css";

const issueStatuses = [
  { key: "open", label: "Open", color: "var(--status-open)" },
  { key: "inProgress", label: "In Progress", color: "var(--status-progress)" },
  { key: "closed", label: "Closed", color: "var(--status-closed)" },
];

const getStatusKey = (status = "") => {
  const normalized = status.trim().toLowerCase().replaceAll("_", " ");
  if (normalized === "in progress" || normalized === "in-progress") {
    return "inProgress";
  }
  if (["closed", "resolved", "done"].includes(normalized)) return "closed";
  return "open";
};

const formatStatus = (status = "") => {
  const statusKey = getStatusKey(status);
  return issueStatuses.find(({ key }) => key === statusKey)?.label ?? status;
};

const getIssueId = (issue) => {
  const id = issue._id || issue.id || "";
  return id ? `ISS-${String(id).slice(-5).toUpperCase()}` : "ISS";
};

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("accessToken") || !userId) {
      navigate("/login", { replace: true });
      return undefined;
    }

    let active = true;
    const fetchIssues = async () => {
      try {
        const response = await axiosRequest(
          "/issues?page=1&limit=5&sort=newest",
        );
        if (active) {
          setIssues(Array.isArray(response.data) ? response.data : []);
          setSummary(response.summary || {
            total: 0,
            open: 0,
            inProgress: 0,
            closed: 0,
          });
        }
      } catch (requestError) {
        if (!active) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load your assigned issues. Please try again.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchIssues();
    return () => {
      active = false;
    };
  }, [navigate, userId]);

  const counts = summary;
  const displayedIssues = issues;
  const percentages = issueStatuses.map(({ key }) =>
    summary.total ? Math.round((counts[key] / summary.total) * 100) : 0,
  );
  const chartStyle = {
    "--open-share": `${percentages[0]}%`,
    "--progress-share": `${percentages[0] + percentages[1]}%`,
  };
  const userName = localStorage.getItem("userName") || "there";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <section className={styles.mainContent} id="employee-dashboard">
        <header className={styles.topbar} id="profile">
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark}>◆</span>
            IssueTracker
          </div>
          <div className={styles.topbarSpacer} />
          <button
            className={styles.notificationButton}
            type="button"
            aria-label="Notifications"
          >
            ♧
            <span className={styles.notificationDot} />
          </button>
          <div className={styles.userMenu}>
            <span className={styles.avatar}>{userInitial}</span>
            <span className={styles.userRole}>{userName}</span>
            <span className={styles.chevron}>⌄</span>
          </div>
        </header>

        <div className={styles.dashboardBody}>
          <div className={styles.pageHeading}>
            <div>
              <p className={styles.eyebrow}>YOUR WORKSPACE</p>
              <h1>My Dashboard</h1>
              <p className={styles.pageSubtitle}>
                Welcome back, {userName}! <span aria-hidden="true">👋</span>
              </p>
            </div>
            <span className={styles.todayLabel}>
              {new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </span>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}

          <section className={styles.statsGrid} aria-label="Your issue summary">
            <article className={`${styles.statCard} ${styles.totalCard}`}>
              <div className={styles.statIcon}>▦</div>
              <p>Assigned Issues</p>
              <strong>{loading ? "—" : summary.total}</strong>
            </article>
            <article className={`${styles.statCard} ${styles.openCard}`}>
              <div className={styles.statIcon}>△</div>
              <p>Open</p>
              <strong>{loading ? "—" : counts.open}</strong>
            </article>
            <article className={`${styles.statCard} ${styles.progressCard}`}>
              <div className={styles.statIcon}>◴</div>
              <p>In Progress</p>
              <strong>{loading ? "—" : counts.inProgress}</strong>
            </article>
            <article className={`${styles.statCard} ${styles.closedCard}`}>
              <div className={styles.statIcon}>✓</div>
              <p>Closed</p>
              <strong>{loading ? "—" : counts.closed}</strong>
            </article>
          </section>

          <section className={styles.detailGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>My Issues by Status</h2>
                  <p>Your assigned issue progress</p>
                </div>
              </div>
              <div className={styles.statusContent}>
                <div
                  className={styles.donutChart}
                  style={chartStyle}
                  role="img"
                  aria-label={`${counts.open} open, ${counts.inProgress} in progress, ${counts.closed} closed`}
                >
                  <div className={styles.donutCenter}>
                    <strong>{loading ? "—" : summary.total}</strong>
                    <span>Issues</span>
                  </div>
                </div>
                <ul className={styles.legend}>
                  {issueStatuses.map(({ key, label, color }, index) => (
                    <li key={key}>
                      <span className={styles.legendLabel}>
                        <i style={{ backgroundColor: color }} />
                        {label}
                      </span>
                      <span className={styles.legendValue}>
                        <strong>{loading ? "—" : counts[key]}</strong>
                        <small>{loading ? "—" : `${percentages[index]}%`}</small>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className={`${styles.panel} ${styles.recentPanel}`} id="my-issues">
              <div className={styles.panelHeading}>
                <div>
                  <h2>Recently Assigned</h2>
                  <p>Issues assigned to you</p>
                </div>
                <button
                  className={styles.viewAll}
                  type="button"
                  onClick={() => navigate("/employee/issues")}
                >
                  View All
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              {loading ? (
                <p className={styles.tableMessage}>Loading your issues…</p>
              ) : displayedIssues.length ? (
                <div className={styles.issueList}>
                  {displayedIssues.map((issue) => {
                    const statusKey = getStatusKey(issue.status);
                    return (
                      <div
                        className={styles.issueRow}
                        key={issue._id || issue.id || issue.issue_title}
                      >
                        <span className={styles.issueId}>{getIssueId(issue)}</span>
                        <span
                          className={styles.issueTitle}
                          title={issue.issue_title}
                        >
                          {issue.issue_title || "Untitled issue"}
                        </span>
                        <span
                          className={`${styles.statusBadge} ${styles[statusKey]}`}
                        >
                          {formatStatus(issue.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.tableMessage}>
                  No issues are assigned to you yet.
                </p>
              )}
            </article>
          </section>
          <footer className={styles.footer}>
            IssueTracker <span>·</span> Employee workspace
          </footer>
        </div>
    </section>
  );
}
