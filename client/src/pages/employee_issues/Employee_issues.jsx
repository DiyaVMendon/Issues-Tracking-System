import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import Select from "react-select";
import { axiosRequest } from "../../api/axiosRequest";
import InfiniteScrollLoader from "../../components/InfiniteScrollLoader";
import {
  deduplicatedRequest,
  mergeItemsById,
} from "../../api/deduplicatedRequest";
import AssetIcon from "../../components/AssetIcon";
import OutsideAlerter from "../../components/OutsideAlerter";
import assignedIssuesIcon from "../../assets/icons/assigned-issues.svg";
import closedIssueIcon from "../../assets/icons/issue-closed.svg";
import openIssueIcon from "../../assets/icons/issue-open.svg";
import progressIssueIcon from "../../assets/icons/issue-progress.svg";
import UserDropdown from "../userDropdown/userDropdown";
import IssueDetailPanel from "../admin_issue/admin_issue_comments/IssueDetailPanel";
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
    borderColor: state.isFocused
      ? "#8c69e2"
      : "var(--theme-border-strong, #dedeea)",
    borderRadius: 8,
    backgroundColor: "var(--theme-surface-input, #fff)",
    color: "var(--theme-text, #39384f)",
    boxShadow: state.isFocused ? "0 0 0 3px rgb(112 72 213 / 10%)" : "none",
    "&:hover": { borderColor: "#8c69e2" },
    cursor: "pointer",
    fontSize: 11,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 11px" }),
  singleValue: (base) => ({
    ...base,
    color: "var(--theme-text, #39384f)",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--theme-text-secondary, #77768c)",
  }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 8px",
    color: "var(--theme-text-secondary, #77768c)",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 10,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "var(--theme-surface-raised, #fff)",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 20 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#7048d5"
      : state.isFocused
        ? "var(--theme-hover, #f3edff)"
        : "var(--theme-surface-raised, #fff)",
    color: state.isSelected ? "#fff" : "var(--theme-text, #39384f)",
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const issueListRef = useRef(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [filtersOpen]);

  useEffect(() => {
    if (!selectedIssue) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedIssue(null);
        setStatusError("");
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedIssue]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
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
      if (page === 1) {
        loadingMoreRef.current = false;
        setLoading(true);
      }
      setError("");
      try {
        const response = await deduplicatedRequest(
          `/issues?${params.toString()}`,
          { skipLoader: page > 1 },
        );
        if (active) {
          const nextIssues = Array.isArray(response.data) ? response.data : [];
          setIssues((currentIssues) =>
            mergeItemsById(
              page === 1 ? [] : currentIssues,
              nextIssues,
              (issue) => issue._id || issue.id || `${issue.issue_title}-${issue.createdAt}`,
            ),
          );
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
        if (page === 1) setIssues([]);
        setPagination((current) => ({ ...current, hasNextPage: false }));
        setError(
          requestError.response?.data?.message ||
            "Could not load your issues. Please try again.",
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
    issueListRef.current?.scrollTo({ top: 0 });
  }, [activeStatus, debouncedSearch, priorityFilter, sortOrder]);

  const loadMoreIssues = () => {
    if (!loading && !loadingMoreRef.current && pagination.hasNextPage) {
      loadingMoreRef.current = true;
      setPage((current) => current + 1);
    }
  };

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

  const updateIssueAfterAttachmentRemoval = (updatedIssue) => {
    const issueId = String(updatedIssue._id || updatedIssue.id);
    setIssues((currentIssues) =>
      currentIssues.map((issue) =>
        String(issue._id || issue.id) === issueId ? updatedIssue : issue,
      ),
    );
    setSelectedIssue(updatedIssue);
    setPage(1);
    setRefreshKey((current) => current + 1);
  };


  return (
    <section className={dashboardStyles.mainContent} id="employee-issues">
        <header className={dashboardStyles.topbar} id="profile">
          <div className={dashboardStyles.mobileBrand}>
            <span className={dashboardStyles.brandMark}>◆</span>
            IssueTracker
          </div>
          <div className={dashboardStyles.topbarSpacer} />
          <UserDropdown />
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
              <div className={dashboardStyles.statIcon}><AssetIcon src={assignedIssuesIcon} /></div>
              <p>Assigned Issues</p>
              <strong>{loading ? "—" : counts.all}</strong>
            </article>
            <article className={`${dashboardStyles.statCard} ${dashboardStyles.openCard}`}>
              <div className={dashboardStyles.statIcon}><AssetIcon src={openIssueIcon} /></div>
              <p>Open</p>
              <strong>{loading ? "—" : counts.open}</strong>
            </article>
            <article className={`${dashboardStyles.statCard} ${dashboardStyles.progressCard}`}>
              <div className={dashboardStyles.statIcon}><AssetIcon src={progressIssueIcon} /></div>
              <p>In Progress</p>
              <strong>{loading ? "—" : counts.inProgress}</strong>
            </article>
            <article className={`${dashboardStyles.statCard} ${dashboardStyles.closedCard}`}>
              <div className={dashboardStyles.statIcon}><AssetIcon src={closedIssueIcon} /></div>
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
                  {key === "closed" && (
                    <span className={`${styles.tabIcon} ${styles.closedTabIcon}`}>
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" />
                        <path d="m5.2 8.1 1.8 1.8 3.8-4" />
                      </svg>
                    </span>
                  )}
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
              <OutsideAlerter
                className={styles.filterPopoverAnchor}
                enabled={filtersOpen}
                ignoreSelector=".issue-select__menu-portal"
                onOutsideClick={() => setFiltersOpen(false)}
              >
                <button
                  className={styles.filterToggle}
                  type="button"
                  aria-label="Toggle issue filters"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 5h16l-6.2 7.1v5.1l-3.6 1.8v-6.9L4 5Z" />
                  </svg>
                </button>
                <div
                  className={`${styles.selectGroup} ${filtersOpen ? styles.selectGroupOpen : ""}`}
                >
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
              </OutsideAlerter>
            </div>

            <div
              className={`${styles.issueWorkspace} ${selectedIssue ? styles.issueWorkspaceWithDetail : ""}`}
            >
              <div className={styles.issueListColumn}>
                <div className={styles.listHeading}>
                  <strong>{pagination.total} Issues</strong>
                  <span>Sort: {sortOptions.find((option) => option.value === sortOrder)?.label.replace("Sort: ", "")}</span>
                </div>
                <div
                  className={styles.issueList}
                  // id="employee-issue-list"
                  ref={issueListRef}
                >
                  <InfiniteScroll
                    dataLength={issues.length}
                    next={loadMoreIssues}
                    hasMore={Boolean(pagination.hasNextPage)}
                    loader={<InfiniteScrollLoader label="Loading more issues…" />}
                    scrollThreshold="160px"
                    // scrollableTarget="employee-issue-list"
                    className={styles.infiniteScrollContent}
                  >
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
                  </InfiniteScroll>
                </div>
                <div className={styles.tableFooter}>
                  <span>Showing {issues.length} of {pagination.total} issues</span>
                  <span aria-live="polite">
                    {loading && page > 1
                      ? "Loading more…"
                      : pagination.hasNextPage
                        ? "Scroll to load more"
                        : "All issues loaded"}
                  </span>
                </div>
              </div>
              {selectedIssue ? (
                <div
                  className={styles.issueDetailContainer}
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setSelectedIssue(null);
                      setStatusError("");
                    }
                  }}
                >
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
                    onAttachmentRemoved={updateIssueAfterAttachmentRemoval}
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>
    </section>
  );
}