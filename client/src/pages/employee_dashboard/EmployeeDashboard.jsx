import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import InfiniteScrollLoader from "../../components/InfiniteScrollLoader";
import {
  deduplicatedRequest,
  mergeItemsById,
} from "../../api/deduplicatedRequest";
import IssueStatCards from "../admin_dashboard/IssueStatCards";
import assignedIssuesIcon from "../../assets/icons/assigned-issues.svg";
import closedIssueIcon from "../../assets/icons/issue-closed.svg";
import openIssueIcon from "../../assets/icons/issue-open.svg";
import progressIssueIcon from "../../assets/icons/issue-progress.svg";
import UserDropdown from "../userDropdown/userDropdown";
import styles from "../admin_dashboard/admin_dashboard.module.css";
import { ClipboardList } from "lucide-react";

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
    if (!localStorage.getItem("accessToken")) {
      navigate("/login", { replace: true });
      return undefined;
    }

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
            "Could not load your assigned issues. Please try again.",
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
  }, [navigate, page]);

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
  const statCards = [
    { label: "Assigned Issues", value: summary.total, icon: assignedIssuesIcon, variant: "totalCard" },
    { label: "Open", value: counts.open, icon: openIssueIcon, variant: "openCard" },
    { label: "In Progress", value: counts.inProgress, icon: progressIssueIcon, variant: "progressCard" },
    { label: "Closed", value: counts.closed, icon: closedIssueIcon, variant: "closedCard" },
  ];
  const percentages = issueStatuses.map(({ key }) =>
    summary.total ? Math.round((counts[key] / summary.total) * 100) : 0,
  );
  const chartStyle = {
    "--open-share": `${percentages[0]}%`,
    "--progress-share": `${percentages[0] + percentages[1]}%`,
  };
  const userName = localStorage.getItem("userName") || "there";

  return (
    <section className={`${styles.mainContent} ${styles.page}`} id="employee-dashboard">
        <header className={styles.topbar} id="profile">
          <div className={styles.mobileBrand}>
            <span className={styles.brandMark}>◆</span>
            IssueTracker
          </div>
          <div className={styles.topbarSpacer} />
          <UserDropdown />
        </header>

        <div className={`${styles.dashboardBody} ${styles.noPageScrollbar} ${styles.body}`}>
          <div className={`${styles.pageHeading} ${styles.heading}`}>
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

          <div className={styles.statsWrap}>
          <IssueStatCards
            items={statCards}
            loading={loading}
            styles={styles}
            label="Your issue summary"
          />
          </div>

          <section className={`${styles.detailGrid} ${styles.details}`}>
            <article className={`${styles.panel} ${styles.chartPanel}`}>
              <div className={styles.panelHeading}>
                <div>
                  <h2>My Issues by Status</h2>
                  <p>Your assigned issue progress</p>
                </div>
              </div>
              <div className={`${styles.statusContent} ${styles.chartContent}`}>
                <div
                  className={`${styles.donutChart} ${styles.donut}`}
                  style={chartStyle}
                  role="img"
                  aria-label={`${counts.open} open, ${counts.inProgress} in progress, ${counts.closed} closed`}
                >
                  <div className={styles.donutCenter}>
                    <strong>{loading ? "—" : summary.total}</strong>
                    <span>Issues</span>
                  </div>
                </div>
                <ul className={`${styles.legend} ${styles.legend}`}>
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

            <article className={`${styles.panel} ${styles.recentPanel} ${styles.recentPanel}`} id="my-issues">
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
                <div className={styles.recentIssuesScroll} id="employee-recent-issues-scroll">
                  <InfiniteScroll
                    className={styles.issueList}
                    dataLength={displayedIssues.length}
                    hasMore={Boolean(pagination.hasNextPage)}
                    loader={<InfiniteScrollLoader label="Loading more issues…" />}
                    next={loadMoreIssues}
                    scrollThreshold="120px"
                    scrollableTarget="employee-recent-issues-scroll"
                  >
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
                  </InfiniteScroll>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}><ClipboardList size={32} strokeWidth={1.6} /></div>
                  <p>No issues are assigned to you yet.</p>
                </div>
              )}
            </article>
          </section>
          <footer className={`${styles.footer} ${styles.footer}`}>
            IssueTracker <span>·</span> Employee workspace
          </footer>
        </div>
    </section>
  );
}
