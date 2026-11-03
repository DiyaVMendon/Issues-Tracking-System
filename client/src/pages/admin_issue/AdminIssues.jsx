import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { axiosRequest } from "../../api/axiosRequest";
import IssueDetailPanel from "../../components/IssueDetailPanel";
import dashboardStyles from "../admin_dashboard/admin_dashboard.module.css";
import styles from "./admin_issues.module.css";

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

const priorityOptions = [
  { value: "all", label: "All Priority" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const issueStatusOptions = statusOptions.slice(1);
const issuePriorityOptions = priorityOptions.slice(1);
const sortOptions = [
  { value: "newest", label: "Sort: Newest" },
  { value: "oldest", label: "Sort: Oldest" },
  { value: "dueSoonest", label: "Sort: Due Date" },
];

const emptyForm = {
  issue_title: "",
  description: "",
  priority: "High",
  status: "Open",
  assigned_to: "",
  due_date: "",
  issue_image: null,
};

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    borderColor: state.isFocused ? "#8c69e2" : "#dedeea",
    borderRadius: 8,
    boxShadow: state.isFocused ? "0 0 0 3px rgb(112 72 213 / 10%)" : "none",
    "&:hover": { borderColor: "#8c69e2" },
    cursor: "pointer",
    fontSize: 10,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 9px" }),
  singleValue: (base) => ({ ...base, color: "#39384f" }),
  placeholder: (base) => ({ ...base, color: "#39384f" }),
  indicatorsContainer: (base) => ({ ...base, minHeight: 32 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 6px", color: "#39384f" }),
  menu: (base) => ({ ...base, zIndex: 20, borderRadius: 8, overflow: "hidden" }),
  menuPortal: (base) => ({ ...base, zIndex: 30 }),
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

const normalizeStatus = (status = "") => {
  const value = status.trim().toLowerCase().replaceAll("_", " ");
  if (value === "in-progress") return "in progress";
  if (["done", "resolved"].includes(value)) return "closed";
  return value || "open";
};

const normalizePriority = (priority = "") => priority.trim().toLowerCase();

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const issueKey = (issue) => issue._id || issue.id;
const getAssignee = (issue) =>
  typeof issue.assigned_to === "object"
    ? issue.assigned_to?.name || "Unassigned"
    : "Unassigned";

const getIssueCode = (issue) => {
  const id = issueKey(issue) || "";
  return id ? `#ISS-${String(id).slice(-5).toUpperCase()}` : "#ISS";
};

const getInitial = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

export default function AdminIssues() {
  const role = localStorage.getItem("role") || "Admin";
  const userName = localStorage.getItem("userName") || role;
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigneeError, setAssigneeError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedIds, setSelectedIds] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [viewingIssue, setViewingIssue] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState([]);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
      status: statusFilter,
      priority: priorityFilter,
      sort: sortOrder,
      search: debouncedSearch,
    });
    if (assigneeFilter !== "all") params.set("userId", assigneeFilter);

    axiosRequest(`/issues?${params.toString()}`)
      .then((response) => {
        if (!active) return;
        const nextIssues = Array.isArray(response.data) ? response.data : [];
        setIssues((current) => {
          if (page === 1 || response.pagination?.page !== page) return nextIssues;
          const merged = new Map(
            current.map((issue) => [String(issueKey(issue)), issue]),
          );
          nextIssues.forEach((issue) =>
            merged.set(String(issueKey(issue)), issue),
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
        if (response.pagination?.page && response.pagination.page !== page) {
          setPage(response.pagination.page);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        setIssues([]);
        setPagination((current) => ({ ...current, hasNextPage: false }));
        setError(
          requestError.response?.data?.message ||
            "Could not load issues. Please try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    assigneeFilter,
    debouncedSearch,
    page,
    priorityFilter,
    refreshKey,
    sortOrder,
    statusFilter,
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

  useEffect(() => {
    let active = true;
    axiosRequest("/auth/users/all")
      .then((response) => {
        if (active) setUsers(Array.isArray(response.data) ? response.data : []);
      })
      .catch((requestError) => {
        if (!active) return;
        setAssigneeError(
          requestError.response?.data?.message || "Could not load assignees.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const usersById = useMemo(
    () => new Map(users.map((user) => [String(user._id), user])),
    [users],
  );
  const assigneeOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user._id,
        label: user.name,
        email: user.email,
      })),
    [users],
  );
  const assigneeFilterOptions = [
    { value: "all", label: "All Assignee" },
    ...assigneeOptions,
  ];

  const visibleIssues = issues;

  const userInitial = getInitial(userName);

  const openCreateForm = () => {
    setEditingIssue(null);
    setForm({ ...emptyForm });
    setFormError(
      assigneeError ||
        (assigneeOptions.length
          ? ""
          : "No assignees are available. Add a team member before creating an issue."),
    );
    setFormOpen(true);
  };

  const openEditForm = (issue) => {
    const assignedTo =
      typeof issue.assigned_to === "object"
        ? issue.assigned_to?._id
        : issue.assigned_to;
    setEditingIssue(issue);
    setForm({
      issue_title: issue.issue_title || "",
      description: issue.description || "",
      priority: issue.priority || "High",
      status: issue.status || "Open",
      assigned_to: assignedTo || "",
      due_date: toDateInput(issue.due_date),
      issue_image: null,
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingIssue(null);
    setFormError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.issue_title.trim() || !form.description.trim() || !form.assigned_to) {
      setFormError("Title, description, and assignee are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingIssue) {
        const result = await axiosRequest(
          `/issues/update-issue/${encodeURIComponent(issueKey(editingIssue))}`,
          {
            issue_title: form.issue_title.trim(),
            description: form.description.trim(),
            priority: form.priority,
            status: form.status,
            assigned_to: form.assigned_to,
            due_date: form.due_date || undefined,
          },
          "PUT",
          { "Content-Type": "application/json" },
        );
        setIssues((current) =>
          current.map((issue) =>
            issueKey(issue) === issueKey(editingIssue) ? result.data : issue,
          ),
        );
      } else {
        const payload = new FormData();
        payload.append("issue_title", form.issue_title.trim());
        payload.append("description", form.description.trim());
        payload.append("priority", form.priority);
        payload.append("status", form.status);
        payload.append("assigned_to", form.assigned_to);
        if (form.due_date) payload.append("due_date", form.due_date);
        if (form.issue_image) payload.append("issue_image", form.issue_image);

        const result = await axiosRequest("/issues/create-issue", payload, "POST");
        const createdIssue = {
          ...result.data,
          assigned_to:
            result.data.assigned_to || usersById.get(form.assigned_to) || form.assigned_to,
        };
        setIssues((current) => [createdIssue, ...current]);
        setPage(1);
      }
      setRefreshKey((current) => current + 1);
      setFormOpen(false);
      setEditingIssue(null);
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.message ||
          `Could not ${editingIssue ? "update" : "create"} the issue.`,
      );
    } finally {
      setSaving(false);
    }
  };

  const removeIssues = async (ids) => {
    const confirmed =
      ids.length === 1
        ? window.confirm("Delete this issue? This action cannot be undone.")
        : window.confirm(
            `Delete ${ids.length} selected issues? This action cannot be undone.`,
          );
    if (!confirmed) return;

    setDeletingIds(ids);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        axiosRequest(`/issues/delete-issue/${encodeURIComponent(id)}`, null, "DELETE"),
      ),
    );
    const deletedIds = ids.filter((_, index) => results[index].status === "fulfilled");
    setIssues((current) =>
      current.filter((issue) => !deletedIds.includes(String(issueKey(issue)))),
    );
    setSelectedIds((current) =>
      current.filter((id) => !deletedIds.includes(id)),
    );
    setDeletingIds([]);

    const failure = results.find((result) => result.status === "rejected");
    if (failure) {
      setError(
        failure.reason.response?.data?.message ||
          `${deletedIds.length} issue(s) deleted; some could not be deleted.`,
      );
    }
    if (deletedIds.length) {
      setPage(1);
      setRefreshKey((current) => current + 1);
    }
    return deletedIds;
  };

  const updateSelectedIssue = async (changes) => {
    if (!viewingIssue) return;
    const id = String(issueKey(viewingIssue));
    setError("");
    setSaving(true);
    try {
      const result = await axiosRequest(
        `/issues/update-issue/${encodeURIComponent(id)}`,
        {
          issue_title: viewingIssue.issue_title,
          description: viewingIssue.description,
          priority: changes.priority || viewingIssue.priority,
          status: changes.status || viewingIssue.status,
          assigned_to:
            typeof viewingIssue.assigned_to === "object"
              ? viewingIssue.assigned_to?._id
              : viewingIssue.assigned_to,
          due_date: viewingIssue.due_date || undefined,
        },
        "PUT",
        { "Content-Type": "application/json" },
      );
      const updatedIssue = result.data;
      setIssues((current) =>
        current.map((issue) =>
          String(issueKey(issue)) === id ? updatedIssue : issue,
        ),
      );
      setViewingIssue(updatedIssue);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update the issue. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const duplicateSelectedIssue = async () => {
    if (!viewingIssue) return;
    const assignedTo =
      typeof viewingIssue.assigned_to === "object"
        ? viewingIssue.assigned_to?._id
        : viewingIssue.assigned_to;
    try {
      const response = await axiosRequest(
        "/issues/create-issue",
        {
          issue_title: `${viewingIssue.issue_title || "Issue"} (Copy)`,
          description: viewingIssue.description,
          priority: viewingIssue.priority,
          status: viewingIssue.status,
          assigned_to: assignedTo,
          due_date: viewingIssue.due_date || undefined,
        },
        "POST",
        { "Content-Type": "application/json" },
      );
      const duplicated = {
        ...response.data,
        assigned_to:
          response.data.assigned_to ||
          usersById.get(String(assignedTo)) ||
          viewingIssue.assigned_to,
      };
      setViewingIssue(duplicated);
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not duplicate the issue. Please try again.",
      );
    }
  };

  const toggleSelection = (id) => {
    const value = String(id);
    setSelectedIds((current) =>
      current.includes(value)
        ? current.filter((selectedId) => selectedId !== value)
        : [...current, value],
    );
  };

  return (
    <section className={dashboardStyles.mainContent} id="admin-issues">
      <header className={dashboardStyles.topbar}>
        <div className={dashboardStyles.mobileBrand}>
          <span className={dashboardStyles.brandMark}>◆</span>
          IssueTracker
        </div>
        <div className={dashboardStyles.topbarSpacer} />
        <span className={styles.accessPill}>Admin - Issues (Full Access)</span>
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
          <span className={dashboardStyles.avatar}>{userInitial}</span>
          <span className={dashboardStyles.userRole}>{userName}</span>
          <span className={dashboardStyles.chevron}>⌄</span>
        </div>
      </header>

      <div className={`${dashboardStyles.dashboardBody} ${styles.issuesBody}`}>
        <div className={styles.headingRow}>
          <div>
            <h1>All Issues</h1>
            <p>Manage, create, assign, edit and delete issues.</p>
          </div>
          <button className={styles.createButton} type="button" onClick={openCreateForm}>
            <span aria-hidden="true">＋</span>
            Create Issue
          </button>
        </div>

        {error && (
          <div className={dashboardStyles.errorBanner} role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        <section className={styles.issuesPanel} aria-label="All issues">
          <div className={styles.toolbar}>
            <label className={styles.searchBox}>
              <span aria-hidden="true">⌕</span>
              <span className={styles.visuallyHidden}>Search issues by title or ID</span>
              <input
                type="search"
                placeholder="Search by title or ID..."
                value={search}
                onChange={(event) => {
                  setLoading(true);
                  setError("");
                  setPage(1);
                  setSearch(event.target.value);
                }}
              />
            </label>
            <Select
              aria-label="Filter by status"
              className={styles.filterSelect}
              classNamePrefix="admin-select"
              isSearchable={false}
              menuPortalTarget={document.body}
              options={statusOptions}
              styles={selectStyles}
              value={statusOptions.find((option) => option.value === statusFilter)}
              onChange={(option) => {
                setLoading(true);
                setError("");
                setPage(1);
                setStatusFilter(option?.value || "all");
              }}
            />
            <Select
              aria-label="Filter by priority"
              className={styles.filterSelect}
              classNamePrefix="admin-select"
              isSearchable={false}
              menuPortalTarget={document.body}
              options={priorityOptions}
              styles={selectStyles}
              value={priorityOptions.find(
                (option) => option.value === priorityFilter,
              )}
              onChange={(option) => {
                setLoading(true);
                setError("");
                setPage(1);
                setPriorityFilter(option?.value || "all");
              }}
            />
            <Select
              aria-label="Filter by assignee"
              className={styles.filterSelect}
              classNamePrefix="admin-select"
              isSearchable
              menuPortalTarget={document.body}
              options={assigneeFilterOptions}
              styles={selectStyles}
              value={assigneeFilterOptions.find(
                (option) => option.value === assigneeFilter,
              )}
              onChange={(option) => {
                setLoading(true);
                setError("");
                setPage(1);
                setAssigneeFilter(option?.value || "all");
              }}
            />
            <Select
              aria-label="Sort issues"
              className={`${styles.filterSelect} ${styles.sortSelect}`}
              classNamePrefix="admin-select"
              isSearchable={false}
              menuPortalTarget={document.body}
              options={sortOptions}
              styles={selectStyles}
              value={sortOptions.find((option) => option.value === sortOrder)}
              onChange={(option) => {
                setLoading(true);
                setError("");
                setPage(1);
                setSortOrder(option?.value || "newest");
              }}
            />
          </div>

          {assigneeError && (
            <p className={styles.assigneeWarning} role="status">
              {assigneeError} Assigning and creating issues may be unavailable.
            </p>
          )}

          {selectedIds.length > 0 && (
            <div className={styles.bulkActions}>
              <span>{selectedIds.length} selected</span>
              <button
                type="button"
                onClick={() => removeIssues(selectedIds)}
                disabled={deletingIds.length > 0}
              >
                Delete selected
              </button>
            </div>
          )}

          <div className={styles.issueWorkspace}>
            <div className={styles.issueListColumn}>
              <div className={styles.listHeading}>
                <strong>{pagination.total} Issues</strong>
                <span>Sort: {sortOptions.find((option) => option.value === sortOrder)?.label.replace("Sort: ", "")}</span>
              </div>
              <div className={styles.issueList}>
                {loading && page === 1 ? (
                  <p className={styles.tableMessage}>Loading issues…</p>
                ) : visibleIssues.length ? (
                  visibleIssues.map((issue) => {
                    const id = String(issueKey(issue));
                    const status = normalizeStatus(issue.status);
                    const statusKey = status === "in progress" ? "inProgress" : status;
                    const selected = String(issueKey(viewingIssue || {})) === id;
                    return (
                      <article
                        className={`${styles.issueListItem} ${selected ? styles.selectedIssue : ""}`}
                        key={id}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${issue.issue_title || "issue"}`}
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleSelection(id)}
                        />
                        <button
                          className={styles.issueListSelect}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setViewingIssue(issue)}
                        >
                          <span className={styles.issueListTop}>
                            <strong>{getIssueCode(issue)}</strong>
                            <span className={`${styles.statusBadge} ${styles[statusKey] || styles.open}`}>
                              {statusOptions.find((option) => option.value === status)?.label || issue.status}
                            </span>
                          </span>
                          <span className={styles.issueListTitle}>{issue.issue_title || "Untitled issue"}</span>
                          <span className={styles.issueListDescription}>{issue.description || "No description provided."}</span>
                          <span className={styles.issueListMeta}>
                            <span>{getInitial(getAssignee(issue))} {getAssignee(issue)}</span>
                            <span>▣ {formatDate(issue.due_date)}</span>
                            <span>◷ {formatDate(issue.createdAt)}</span>
                          </span>
                        </button>
                      </article>
                    );
                  })
                ) : (
                  <p className={styles.tableMessage}>
                    {summary.total
                      ? "No issues match the selected filters."
                      : "No issues have been created yet."}
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
            {viewingIssue ? (
              <IssueDetailPanel
                key={issueKey(viewingIssue)}
                issue={viewingIssue}
                isAdmin
                saving={saving}
                onClose={() => setViewingIssue(null)}
                onEdit={() => {
                  const issue = viewingIssue;
                  setViewingIssue(null);
                  openEditForm(issue);
                }}
                onDelete={async () => {
                  const id = String(issueKey(viewingIssue));
                  const deleted = await removeIssues([id]);
                  if (deleted.includes(id)) setViewingIssue(null);
                }}
                onDuplicate={duplicateSelectedIssue}
                onAdminUpdate={updateSelectedIssue}
              />
            ) : (
              <div className={styles.emptyDetail}>
                <span>▤</span>
                <strong>Select an issue to view its details</strong>
                <p>Choose an issue from the list to see its description and activity.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {formOpen && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget || saving) return;
            setFormOpen(false);
            setEditingIssue(null);
          }}
        >
            <section
              className={styles.issueModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="issue-form-title"
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalHeading}>
                  <span className={styles.modalIcon}>▤</span>
                  <div>
                    <h2 id="issue-form-title">
                      {editingIssue ? "Edit Issue" : "Create Issue"}
                    </h2>
                    <p>
                      {editingIssue
                        ? "Update issue details and assignment."
                        : "Add a new issue, assign it to a team member and set priority."}
                    </p>
                  </div>
                </div>
                <button
                  className={styles.closeButton}
                  type="button"
                  aria-label="Close dialog"
                  onClick={closeForm}
                  disabled={saving}
                >
                  ×
                </button>
              </div>

              <form className={styles.issueForm} onSubmit={handleSave}>
                <label className={styles.formField}>
                  <span>Issue Title <b>*</b></span>
                  <input
                    value={form.issue_title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        issue_title: event.target.value,
                      }))
                    }
                    maxLength={120}
                    required
                  />
                </label>
                <label className={styles.formField}>
                  <span>Description <b>*</b></span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <div className={styles.formGrid}>
                  <label className={styles.formField}>
                    <span>Priority <b>*</b></span>
                    <Select
                      aria-label="Issue priority"
                      classNamePrefix="admin-select"
                      isSearchable={false}
                      menuPortalTarget={document.body}
                      options={issuePriorityOptions}
                      styles={selectStyles}
                      value={issuePriorityOptions.find(
                        (option) =>
                          option.value === normalizePriority(form.priority),
                      )}
                      onChange={(option) =>
                        setForm((current) => ({
                          ...current,
                          priority: option?.label || current.priority,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.formField}>
                    <span>Status <b>*</b></span>
                    <Select
                      aria-label="Issue status"
                      classNamePrefix="admin-select"
                      isSearchable={false}
                      menuPortalTarget={document.body}
                      options={issueStatusOptions}
                      styles={selectStyles}
                      value={issueStatusOptions.find(
                        (option) =>
                          option.value === normalizeStatus(form.status),
                      )}
                      onChange={(option) =>
                        setForm((current) => ({
                          ...current,
                          status: option?.label || current.status,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.formField}>
                    <span>Assign To <b>*</b></span>
                    <Select
                      aria-label="Assign issue to"
                      classNamePrefix="admin-select"
                      isSearchable
                      menuPortalTarget={document.body}
                      options={assigneeOptions}
                      placeholder="Select team member"
                      styles={selectStyles}
                      value={assigneeOptions.find(
                        (option) => option.value === form.assigned_to,
                      )}
                      onChange={(option) =>
                        setForm((current) => ({
                          ...current,
                          assigned_to: option?.value || "",
                        }))
                      }
                    />
                  </label>
                  <label className={styles.formField}>
                    <span>Due Date</span>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          due_date: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                {!editingIssue && (
                  <label className={styles.formField}>
                    <span>Attachments (Optional)</span>
                    <span className={styles.uploadBox}>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          {
                            const file = event.target.files?.[0] || null;
                            if (file && file.size > 5 * 1024 * 1024) {
                              setFormError("Attachment must be 5 MB or smaller.");
                              event.target.value = "";
                              return;
                            }
                            setFormError("");
                            setForm((current) => ({
                              ...current,
                              issue_image: file,
                            }));
                          }
                        }
                      />
                      <span aria-hidden="true">⇧</span>
                      {form.issue_image
                        ? form.issue_image.name
                        : "Choose an image to attach (Max 5 MB)"}
                    </span>
                  </label>
                )}

                {formError && (
                  <p className={styles.formError} role="alert">
                    {formError}
                  </p>
                )}
                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button className={styles.saveButton} type="submit" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : editingIssue
                        ? "Save Changes"
                        : "Create Issue"}
                  </button>
                </div>
              </form>
            </section>
        </div>
      )}
    </section>
  );
}