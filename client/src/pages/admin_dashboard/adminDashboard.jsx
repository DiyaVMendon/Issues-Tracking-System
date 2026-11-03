import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { axiosRequest } from "../../api/axiosRequest";
import IssueStatusIcon from "../../components/IssueStatusIcon";
import IssuesIcon from "../../components/IssuesIcon";
import NotificationIcon from "../../components/NotificationIcon";
import styles from "./admin_dashboard.module.css";

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

export default function AdminDashboard() {
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
    let active = true;

    const fetchIssues = async () => {
      try {
        const response = await axiosRequest("/issues?page=1&limit=5&sort=newest");
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
            "Could not load issues. Please try again.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchIssues();
    return () => {
      active = false;
    };
  }, []);

  const counts = summary;
  const displayedIssues = issues;
  const totalIssues = summary.total;
  const percentages = issueStatuses.map(({ key }) =>
    totalIssues ? Math.round((counts[key] / totalIssues) * 100) : 0,
  );
  const chartStyle = {
    "--open-share": `${percentages[0]}%`,
    "--progress-share": `${percentages[0] + percentages[1]}%`,
  };
  const role = localStorage.getItem("role") || "admin";
  const userInitial = role.charAt(0).toUpperCase();

  return (
    <section className={styles.mainContent} id="dashboard">
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark}>◆</span>
            IssueTracker
          </div>
          <div className={styles.topbarSpacer} />
          <button className={styles.notificationButton} type="button" aria-label="Notifications">
            <NotificationIcon />
            <span className={styles.notificationDot} />
          </button>
          <div className={styles.userMenu}>
            <span className={styles.avatar}>{userInitial}</span>
            <span className={styles.userRole}>{role}</span>
            <span className={styles.chevron}>⌄</span>
          </div>
        </header>

        <div className={styles.dashboardBody}>
          <div className={styles.pageHeading}>
            <div>
              <p className={styles.eyebrow}>WORKSPACE OVERVIEW</p>
              <h1>Dashboard</h1>
              <p className={styles.pageSubtitle}>Overview of all issues in the system</p>
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

          <section className={styles.statsGrid} aria-label="Issue summary">
            <article className={`${styles.statCard} ${styles.totalCard}`}>
              <div className={styles.statIcon}><IssuesIcon /></div>
              <p>Total Issues</p>
              <strong>{loading ? "—" : totalIssues}</strong>
            </article>
            <article className={`${styles.statCard} ${styles.openCard}`}>
              <div className={styles.statIcon}><IssueStatusIcon status="open" /></div>
              <p>Open</p>
              <strong>{loading ? "—" : counts.open}</strong>
            </article>
            <article className={`${styles.statCard} ${styles.progressCard}`}>
              <div className={styles.statIcon}><IssueStatusIcon status="inProgress" /></div>
              <p>In Progress</p>
              <strong>{loading ? "—" : counts.inProgress}</strong>
            </article>
            <article className={`${styles.statCard} ${styles.closedCard}`}>
              <div className={styles.statIcon}><IssueStatusIcon status="closed" /></div>
              <p>Closed</p>
              <strong>{loading ? "—" : counts.closed}</strong>
            </article>
          </section>

          <section className={styles.detailGrid}>
            <article className={styles.panel} id="status-breakdown">
              <div className={styles.panelHeading}>
                <div>
                  <h2>Issues by Status</h2>
                  <p>Current distribution</p>
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
                    <strong>{loading ? "—" : totalIssues}</strong>
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

            <article className={`${styles.panel} ${styles.recentPanel}`} id="recent-issues">
              <div className={styles.panelHeading}>
                <div>
                  <h2>Recent Issues</h2>
                  <p>Latest activity across your workspace</p>
                </div>
                <Link
                  className={styles.viewAll}
                  to="/admin/issues"
                >
                  View All
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              {loading ? (
                <p className={styles.tableMessage}>Loading issues…</p>
              ) : displayedIssues.length ? (
                <div className={styles.issueList}>
                  {displayedIssues.map((issue) => {
                    const statusKey = getStatusKey(issue.status);
                    return (
                      <div className={styles.issueRow} key={issue._id || issue.id || issue.issue_title}>
                        <span className={styles.issueId}>{getIssueId(issue)}</span>
                        <span className={styles.issueTitle} title={issue.issue_title}>
                          {issue.issue_title || "Untitled issue"}
                        </span>
                        <span className={`${styles.statusBadge} ${styles[statusKey]}`}>
                          {formatStatus(issue.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.tableMessage}>No issues have been created yet.</p>
              )}
            </article>
          </section>
          <footer className={styles.footer}>IssueTracker <span>·</span> Admin workspace</footer>
        </div>
    </section>
  );
}