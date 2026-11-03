import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import InfiniteScrollLoader from "../../components/InfiniteScrollLoader";
import {
  deduplicatedRequest,
  mergeItemsById,
} from "../../api/deduplicatedRequest";
import IssueStatCards from "./IssueStatCards";
import closedIssueIcon from "../../assets/icons/issue-closed.svg";
import openIssueIcon from "../../assets/icons/issue-open.svg";
import progressIssueIcon from "../../assets/icons/issue-progress.svg";
import issuesIcon from "../../assets/icons/issues.svg";
import UserDropdown from "../userDropdown/userDropdown";
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ hasNextPage: false });
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let active = true;

    const fetchIssues = async () => {
      if (page === 1) setLoading(true);
      setError("");
      try {
        const response = await deduplicatedRequest(
          `/issues?page=${page}&limit=5&sort=newest`,
          { skipLoader: page > 1 },
        );
        if (active) {
          const nextIssues = Array.isArray(response.data) ? response.data : [];
          setIssues((currentIssues) => {
            return mergeItemsById(
              page === 1 ? [] : currentIssues,
              nextIssues,
              (issue) => issue._id || issue.id || `${issue.issue_title}-${issue.createdAt}`,
            );
          });
          setSummary(response.summary || {
            total: 0,
            open: 0,
            inProgress: 0,
            closed: 0,
          });
          setPagination(response.pagination || { hasNextPage: false });
        }
      } catch (requestError) {
        if (!active) return;
        setPagination({ hasNextPage: false });
        setError(
          requestError.response?.data?.message ||
            "Could not load issues. Please try again.",
        );
      } finally {
        if (active) {
          if (page === 1) setLoading(false);
          else loadingMoreRef.current = false;
        }
      }
    };

    fetchIssues();
    return () => {
      active = false;
    };
  }, [page]);

  const counts = summary;
  const displayedIssues = issues;
  const loadMoreIssues = () => {
    if (
      !loading &&
      !loadingMoreRef.current &&
      pagination.hasNextPage
    ) {
      loadingMoreRef.current = true;
      setPage((current) => current + 1);
    }
  };
  const totalIssues = summary.total;
  const statCards = [
    { label: "Total Issues", value: totalIssues, icon: issuesIcon, variant: "totalCard" },
    { label: "Open", value: counts.open, icon: openIssueIcon, variant: "openCard" },
    { label: "In Progress", value: counts.inProgress, icon: progressIssueIcon, variant: "progressCard" },
    { label: "Closed", value: counts.closed, icon: closedIssueIcon, variant: "closedCard" },
  ];
  const percentages = issueStatuses.map(({ key }) =>
    totalIssues ? Math.round((counts[key] / totalIssues) * 100) : 0,
  );
  const chartStyle = {
    "--open-share": `${percentages[0]}%`,
    "--progress-share": `${percentages[0] + percentages[1]}%`,
  };
  return (
    <section className={styles.mainContent} id="dashboard">
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark}>◆</span>
            IssueTracker
          </div>
          <div className={styles.topbarSpacer} />
          <UserDropdown />
        </header>

        <div className={`${styles.dashboardBody} ${styles.noPageScrollbar}`}>
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

          <IssueStatCards
            items={statCards}
            loading={loading}
            styles={styles}
            label="Issue summary"
          />

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
                <div className={styles.recentIssuesScroll} id="admin-recent-issues-scroll">
                  <InfiniteScroll
                    className={styles.issueList}
                    dataLength={displayedIssues.length}
                    hasMore={Boolean(pagination.hasNextPage)}
                    loader={<InfiniteScrollLoader label="Loading more issues…" />}
                    next={loadMoreIssues}
                    scrollThreshold="120px"
                    scrollableTarget="admin-recent-issues-scroll"
                  >
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
                  </InfiniteScroll>
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