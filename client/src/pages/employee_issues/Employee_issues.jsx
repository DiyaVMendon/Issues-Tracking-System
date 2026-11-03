import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { axiosRequest } from "../../api/axiosRequest";
import IssueDetailPanel from "../../components/IssueDetailPanel";
import dashboardStyles from "../admin_dashboard/admin_dashboard.module.css";
import styles from "./employee_issues.module.css";

const statusTabs = [
  { key: "all", label: "All Issues" },
  { key: "open", label: "Open" },
  { key: "inProgress", label: "In Progress" },
  { key: "closed", label: "Closed" },
];

const priorityOptions = [
  { value: "all", label: "All Priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const sortOptions = [
  { value: "newest", label: "Sort: Newest" },
  { value: "oldest", label: "Sort: Oldest" },
  { value: "dueSoonest", label: "Sort: Due Date" },
];

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    height: 36,
    borderColor: state.isFocused ? "#8c69e2" : "#dedeea",
    borderRadius: 8,
    boxShadow: state.isFocused ? "0 0 0 3px rgb(112 72 213 / 10%)" : "none",
    "&:hover": { borderColor: "#8c69e2" },
    cursor: "pointer",
    fontSize: 11,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 11px" }),
  singleValue: (base) => ({ ...base, color: "#39384f" }),
  placeholder: (base) => ({ ...base, color: "#39384f" }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 8px", color: "#39384f" }),
  menu: (base) => ({ ...base, zIndex: 10, borderRadius: 8, overflow: "hidden" }),
  menuPortal: (base) => ({ ...base, zIndex: 20 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#7048d5"
      : state.isFocused
        ? "#f3edff"
        : "#fff",
    color: state.isSelected ? "#fff" : "#39384f",
    cursor: "pointer",
    fontSize: 11,
  }),
};

const getStatusKey = (status = "") => {
  const normalized = status.trim().toLowerCase().replaceAll("_", " ");
  if (normalized === "in progress" || normalized === "in-progress") {
    return "inProgress";
  }
  if (["closed", "resolved", "done"].includes(normalized)) return "closed";
  return "open";
};

const formatStatus = (status = "") => {
  const key = getStatusKey(status);
  return statusTabs.find(({ key: tabKey }) => tabKey === key)?.label ?? status;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getIssueId = (issue) => {
  const id = issue._id || issue.id || "";
  return id ? `#ISS-${String(id).slice(-5).toUpperCase()}` : "#ISS";
};

const getAssignedId = (assignedTo) =>
  typeof assignedTo === "object" ? assignedTo?._id : assignedTo;

export default function EmployeeIssues() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName") || "Employee";
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!localStorage.getItem("accessToken") || !userId) {
      navigate("/login", { replace: true });
      return undefined;
    }

    let active = true;
    const fetchIssues = async () => {
      const status = {
        all: "all",
        open: "open",
        inProgress: "in progress",
        closed: "closed",
      }[activeStatus];
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        status,
        priority: priorityFilter,
        sort: sortOrder,
        search: debouncedSearch,
      });
      setLoading(true);
      setError("");
      try {
        const response = await axiosRequest(`/issues?${params.toString()}`);
        if (active) {
          const nextIssues = Array.isArray(response.data) ? response.data : [];
          setIssues((currentIssues) => {
            if (page === 1 || response.pagination?.page !== page) {
              return nextIssues;
            }
            const merged = new Map(
              currentIssues.map((issue) => [
                String(issue._id || issue.id),
                issue,
              ]),
            );
            nextIssues.forEach((issue) =>
              merged.set(String(issue._id || issue.id), issue),
            );
            return Array.from(merged.values());
          });
          setSummary(response.summary || {
            total: 0,
            open: 0,
            inProgress: 0,
            closed: 0,
          });
          setPagination(response.pagination || {
            page,
            limit: 10,
            total: 0,
            totalPages: 0,
          });
        }
      } catch (requestError) {
        if (!active) return;
        setIssues([]);
        setPagination((current) => ({ ...current, hasNextPage: false }));
        setError(
          requestError.response?.data?.message ||
            "Could not load your issues. Please try again.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchIssues();
    return () => {
      active = false;
    };
  }, [
    activeStatus,
    debouncedSearch,
    navigate,
    page,
    priorityFilter,
    refreshKey,
    sortOrder,
    userId,
  ]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pagination.hasNextPage && !loading) {
          setLoading(true);
          setPage((current) => current + 1);
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, pagination.hasNextPage]);

  const counts = {
    all: summary.total,
    open: summary.open,
    inProgress: summary.inProgress,
    closed: summary.closed,
  };
  const filteredIssues = issues;

  const handleStatusSave = async (status, dueDate) => {
    if (!selectedIssue?._id && !selectedIssue?.id) return;
    setSavingStatus(true);
    setStatusError("");
    try {
      const issueId = selectedIssue._id || selectedIssue.id;
      const result = await axiosRequest(
        `/issues/update-issue/${encodeURIComponent(issueId)}`,
        {
          issue_title: selectedIssue.issue_title,
          description: selectedIssue.description,
          priority: selectedIssue.priority,
          status,
          assigned_to: getAssignedId(selectedIssue.assigned_to) || userId,
          due_date: dueDate || undefined,
        },
        "PUT",
        { "Content-Type": "application/json" },
      );
      const updatedIssue = result.data;
      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          (issue._id || issue.id) === issueId ? updatedIssue : issue,
        ),
      );
      setSelectedIssue(updatedIssue);
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setStatusError(
        requestError.response?.data?.message ||
          "Could not update the issue status. Please try again.",
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const currentUserInitial = userName.charAt(0).toUpperCase();

  return (
    <section className={dashboardStyles.mainContent} id="employee-issues">
        <header className={dashboardStyles.topbar} id="profile">
          <div className={dashboardStyles.mobileBrand}>
            <span className={dashboardStyles.brandMark}>◆</span>
            IssueTracker
          </div>
          <div className={dashboardStyles.topbarSpacer} />
          <button
            className={dashboardStyles.notificationButton}
            type="button"
            aria-label="Notifications"
          >
            ♧
            <span className={dashboardStyles.notificationDot} />
          </button>
          <div className={dashboardStyles.userMenu}>
            <span className={dashboardStyles.avatar}>{currentUserInitial}</span>
            <span className={dashboardStyles.userRole}>{userName}</span>
            <span className={dashboardStyles.chevron}>⌄</span>
          </div>
        </header>

        <div className={`${dashboardStyles.dashboardBody} ${styles.issuesBody}`}>
          <div className={styles.pageHeading}>
            <div>
              <p className={dashboardStyles.eyebrow}>YOUR WORKSPACE</p>
              <h1>My Issues</h1>
              <p className={dashboardStyles.pageSubtitle}>
                View and track the issues assigned to you, and update their status.
              </p>
            </div>
          </div>

          {error && (
            <div className={dashboardStyles.errorBanner} role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}

          <section
            className={`${dashboardStyles.statsGrid} ${styles.issueStats}`}
            aria-label="Assigned issue summary"
          >
            <article className={`${dashboardStyles.statCard} ${dashboardStyles.totalCard}`}>
              <div className={dashboardStyles.statIcon}>▱</div>
              <p>Assigned Issues</p>
              <strong>{loading ? "—" : counts.all}</strong>
            </article>
            <article className={`${dashboardStyles.statCard} ${dashboardStyles.openCard}`}>
              <div className={dashboardStyles.statIcon}>△</div>
              <p>Open</p>
              <strong>{loading ? "—" : counts.open}</strong>
            </article>
            <article className={`${dashboardStyles.statCard} ${dashboardStyles.progressCard}`}>
              <div className={dashboardStyles.statIcon}>◴</div>
              <p>In Progress</p>
              <strong>{loading ? "—" : counts.inProgress}</strong>
            </article>
            <article className={`${dashboardStyles.statCard} ${dashboardStyles.closedCard}`}>
              <div className={dashboardStyles.statIcon}>✓</div>
              <p>Closed</p>
              <strong>{loading ? "—" : counts.closed}</strong>
            </article>
          </section>

          <section className={styles.issuesPanel} aria-label="Your issues">
            <div className={styles.statusTabs} role="tablist" aria-label="Filter by status">
              {statusTabs.map(({ key, label }) => (
                <button
                  className={`${styles.statusTab} ${activeStatus === key ? styles.activeTab : ""}`}
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeStatus === key}
                  onClick={() => {
                    setPage(1);
                    setActiveStatus(key);
                  }}
                >
                  {key === "all" && <span className={styles.tabIcon}>▤</span>}
                  {key === "open" && <span className={styles.tabCircle} />}
                  {key === "inProgress" && <span className={styles.tabIcon}>◴</span>}
                  {key === "closed" && <span className={styles.tabIcon}>✓</span>}
                  {label} ({loading ? "—" : counts[key]})
                </button>
              ))}
            </div>

            <div className={styles.tableToolbar}>
              <label className={styles.searchBox}>
                <span className={styles.searchIcon} aria-hidden="true">⌕</span>
                <span className={styles.visuallyHidden}>Search issues</span>
                <input
                  type="search"
                  placeholder="Search by title or ID..."
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                />
              </label>
              <div className={styles.selectGroup}>
                <label className={styles.visuallyHidden} id="priority-filter-label">
                  Filter by priority
                </label>
                <Select
                  inputId="priority-filter"
                  aria-labelledby="priority-filter-label"
                  className={styles.toolbarSelect}
                  classNamePrefix="issue-select"
                  isSearchable={false}
                  menuPortalTarget={document.body}
                  options={priorityOptions}
                  styles={selectStyles}
                  value={priorityOptions.find(
                    (option) => option.value === priorityFilter,
                  )}
                  onChange={(option) => {
                    setPage(1);
                    setPriorityFilter(option?.value || "all");
                  }}
                />
                <label className={styles.visuallyHidden} id="issue-sort-label">
                  Sort issues
                </label>
                <Select
                  inputId="issue-sort"
                  aria-labelledby="issue-sort-label"
                  className={styles.toolbarSelect}
                  classNamePrefix="issue-select"
                  isSearchable={false}
                  menuPortalTarget={document.body}
                  options={sortOptions}
                  styles={selectStyles}
                  value={sortOptions.find(
                    (option) => option.value === sortOrder,
                  )}
                  onChange={(option) => {
                    setPage(1);
                    setSortOrder(option?.value || "newest");
                  }}
                />
              </div>
            </div>

            <div className={styles.issueWorkspace}>
              <div className={styles.issueListColumn}>
                <div className={styles.listHeading}>
                  <strong>{pagination.total} Issues</strong>
                  <span>Sort: {sortOptions.find((option) => option.value === sortOrder)?.label.replace("Sort: ", "")}</span>
                </div>
                <div className={styles.issueList}>
                  {loading && page === 1 ? (
                    <p className={styles.tableMessage}>Loading your issues…</p>
                  ) : filteredIssues.length ? (
                    filteredIssues.map((issue) => {
                      const statusKey = getStatusKey(issue.status);
                      const selected =
                        String(selectedIssue?._id || selectedIssue?.id || "") ===
                        String(issue._id || issue.id);
                      return (
                        <button
                          className={`${styles.issueListItem} ${selected ? styles.selectedIssue : ""}`}
                          key={issue._id || issue.id || issue.issue_title}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setSelectedIssue(issue);
                            setStatusError("");
                          }}
                        >
                          <span className={styles.issueListTop}>
                            <strong>{getIssueId(issue)}</strong>
                            <span className={`${styles.statusBadge} ${styles[statusKey]}`}>
                              {formatStatus(issue.status)}
                            </span>
                          </span>
                          <span className={styles.issueListTitle}>{issue.issue_title || "Untitled issue"}</span>
                          <span className={styles.issueListDescription}>{issue.description || "No description provided."}</span>
                          <span className={styles.issueListMeta}>
                            <span>⌃ {issue.priority || "Unspecified"}</span>
                            <span>▣ {formatDate(issue.due_date)}</span>
                            <span>◷ {formatDate(issue.createdAt)}</span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className={styles.tableMessage}>
                      {summary.total
                        ? "No issues match your filters."
                        : "No issues are assigned to you yet."}
                    </p>
                  )}
                </div>
                <div className={styles.tableFooter}>
                  <span>Showing {issues.length} of {pagination.total} issues</span>
                  <span ref={loadMoreRef} aria-live="polite">
                    {loading && page > 1
                      ? "Loading more…"
                      : pagination.hasNextPage
                        ? "Scroll to load more"
                        : "All issues loaded"}
                  </span>
                </div>
              </div>
              {selectedIssue ? (
                <IssueDetailPanel
                  key={selectedIssue._id || selectedIssue.id}
                  issue={selectedIssue}
                  saving={savingStatus}
                  error={statusError}
                  onClose={() => {
                    setSelectedIssue(null);
                    setStatusError("");
                  }}
                  onEmployeeStatusSave={handleStatusSave}
                />
              ) : (
                <div className={styles.emptyDetail}>
                  <span>▤</span>
                  <strong>Select an issue to view its details</strong>
                  <p>Choose an issue to view its description, attachment, and activity.</p>
                </div>
              )}
            </div>
          </section>
        </div>
    </section>
  );
}