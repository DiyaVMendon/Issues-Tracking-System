import { useEffect, useRef, useState } from "react";
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
import crownIcon from "../../assets/icons/crown.svg";
import trashIcon from "../../assets/icons/trash.svg";
import userGroupIcon from "../../assets/icons/user-group.svg";
import userProfileIcon from "../../assets/icons/user-profile.svg";
import UserDropdown from "../userDropdown/userDropdown";
import dashboardStyles from "../admin_dashboard/admin_dashboard.module.css";
import styles from "./admin_users.module.css";

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Employee" },
];
const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
const editRoleOptions = roleOptions.slice(1);
const editStatusOptions = statusOptions.slice(1);

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  isActive: true,
};
const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    borderColor: state.isFocused
      ? "#8c69e2"
      : "var(--theme-border-strong, #dedeea)",
    borderRadius: 8,
    backgroundColor: "var(--theme-surface-input, #fff)",
    color: "var(--theme-text, #39384f)",
    boxShadow: state.isFocused ? "0 0 0 3px rgb(112 72 213 / 10%)" : "none",
    cursor: "pointer",
    fontSize: 11,
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--theme-text, #39384f)",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--theme-text-secondary, #77768c)",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "var(--theme-text-secondary, #77768c)",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  menuPortal: (base) => ({ ...base, zIndex: 10020 }),
  menu: (base) => ({
    ...base,
    zIndex: 10020,
    backgroundColor: "var(--theme-surface-raised, #fff)",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#7048d5"
      : state.isFocused
        ? "var(--theme-hover, #f3edff)"
        : "var(--theme-surface-raised, #fff)",
    color: state.isSelected ? "#fff" : "var(--theme-text, #39384f)",
    cursor: "pointer",
  }),
};

const getUserRole = (user) =>
  user.role?.toLowerCase() === "admin" ? "admin" : "employee";

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

export default function AdminUsers() {
  const userId = localStorage.getItem("userId");
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ total: 0, admins: 0, employees: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    hasNextPage: false,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalMode, setModalMode] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      if (page === 1) {
        loadingMoreRef.current = false;
        setLoading(true);
      }
      setError("");
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
      });
      try {
        const response = await deduplicatedRequest(
          `/auth/users/manage?${params}`,
          { skipLoader: page > 1 },
        );
        if (!active) return;
        const nextUsers = Array.isArray(response.data) ? response.data : [];
        setUsers((current) => {
          return mergeItemsById(
            page === 1 ? [] : current,
            nextUsers,
            (user) => user._id || user.id,
          );
        });
        setSummary(response.summary || { total: 0, admins: 0, employees: 0 });
        setPagination(response.pagination || {
          page,
          total: 0,
          hasNextPage: false,
        });
      } catch (requestError) {
        if (!active) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load users. Please try again.",
        );
        if (page === 1) setUsers([]);
      } finally {
        if (active) {
          if (page === 1) setLoading(false);
          loadingMoreRef.current = false;
        }
      }
    };

    loadUsers();
    return () => {
      active = false;
    };
  }, [debouncedSearch, page, refreshKey, roleFilter, statusFilter]);

  const loadMoreUsers = () => {
    if (!loading && !loadingMoreRef.current && pagination.hasNextPage) {
      loadingMoreRef.current = true;
      setPage((current) => current + 1);
    }
  };

  const changeFilters = (change) => {
    loadingMoreRef.current = false;
    setPage(1);
    setUsers([]);
    if (change.role !== undefined) setRoleFilter(change.role);
    if (change.status !== undefined) setStatusFilter(change.status);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError("");
    setModalMode("create");
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: getUserRole(user),
      isActive: user.isActive !== false,
    });
    setFormError("");
    setModalMode("edit");
  };

  const closeForm = () => {
    if (saving) return;
    setModalMode("");
    setEditingUser(null);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      isActive: form.isActive,
    };
    if (modalMode === "create") payload.password = form.password;
    try {
      const isEditing = modalMode === "edit";
      const response = await axiosRequest(
        isEditing
          ? `/auth/users/manage/${encodeURIComponent(editingUser._id)}`
          : "/auth/users/manage",
        payload,
        isEditing ? "PUT" : "POST",
      );
      const savedUser = response.data;
      setUsers((current) =>
        isEditing
          ? current.map((user) =>
              String(user._id) === String(savedUser._id) ? savedUser : user,
            )
          : [savedUser, ...current],
      );
      if (!isEditing) {
        setSummary((current) => ({
          total: current.total + 1,
          admins: current.admins + (savedUser.role === "admin" ? 1 : 0),
          employees: current.employees + (savedUser.role === "admin" ? 0 : 1),
        }));
        setPagination((current) => ({ ...current, total: current.total + 1 }));
      } else {
        const oldRole = getUserRole(editingUser);
        const newRole = getUserRole(savedUser);
        if (oldRole !== newRole) {
          setSummary((current) => ({
            ...current,
            admins: current.admins + (newRole === "admin" ? 1 : -1),
            employees: current.employees + (newRole === "employee" ? 1 : -1),
          }));
        }
      }
      setRefreshKey((current) => current + 1);
      setModalMode("");
      setEditingUser(null);
      if (!isEditing) {
        setPage(1);
        setSearch("");
        setDebouncedSearch("");
        setRoleFilter("all");
        setStatusFilter("all");
      }
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.message || "Could not save this user.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await axiosRequest(
        `/auth/users/manage/${encodeURIComponent(deleteTarget._id)}`,
        null,
        "DELETE",
      );
      setUsers((current) =>
        current.filter((user) => String(user._id) !== String(deleteTarget._id)),
      );
      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
      setSummary((current) => ({
        total: Math.max(0, current.total - 1),
        admins: Math.max(
          0,
          current.admins - (getUserRole(deleteTarget) === "admin" ? 1 : 0),
        ),
        employees: Math.max(
          0,
          current.employees - (getUserRole(deleteTarget) === "employee" ? 1 : 0),
        ),
      }));
      setDeleteTarget(null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Could not delete this user.",
      );
    } finally {
      setDeleting(false);
    }
  };


  return (
    <section className={dashboardStyles.mainContent}>
      <header className={dashboardStyles.topbar}>
        <div className={dashboardStyles.mobileBrand}>
          <span className={dashboardStyles.brandMark}>◆</span>
          IssueTracker
        </div>
        <div className={dashboardStyles.topbarSpacer} />
        <UserDropdown />
      </header>

      <div className={`${dashboardStyles.dashboardBody} ${styles.usersBody}`}>
        <div className={styles.pageHeading}>
          <div>
            <h1>Users</h1>
            <p>Manage system users, their roles and access.</p>
          </div>
          <button className={styles.addButton} type="button" onClick={openCreate}>
            ＋ <span>Add User</span>
          </button>
        </div>

        <section className={styles.statsGrid} aria-label="User summary">
          <article className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.totalIcon}`}>
              <AssetIcon src={userGroupIcon} size={17} />
            </span>
            <div><span>Total Users</span><strong>{summary.total}</strong></div>
          </article>
          <article className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.adminIcon}`}>
              <AssetIcon src={crownIcon} size={17} />
            </span>
            <div><span>Admins</span><strong>{summary.admins}</strong></div>
          </article>
          <article className={styles.statCard}>
            <span className={`${styles.statIcon} ${styles.employeeIcon}`}>
              <AssetIcon src={userGroupIcon} size={17} />
            </span>
            <div><span>Employees</span><strong>{summary.employees}</strong></div>
          </article>
        </section>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        <section className={styles.usersPanel} aria-label="System users">
          <div className={styles.filters}>
            <label className={styles.searchBox}>
              <span aria-hidden="true">⌕</span>
              <span className={styles.visuallyHidden}>Search users</span>
              <input
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setUsers([]);
                  loadingMoreRef.current = false;
                  setSearch(event.target.value);
                }}
              />
            </label>
            <OutsideAlerter
              className={styles.filterPopoverAnchor}
              enabled={filtersOpen}
              ignoreSelector=".users-select__menu-portal"
              onOutsideClick={() => setFiltersOpen(false)}
            >
              <button
                className={styles.filterToggle}
                type="button"
                aria-label="Toggle user filters"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 5h16l-6.2 7.1v5.1l-3.6 1.8v-6.9L4 5Z" />
                </svg>
              </button>
              <div
                className={`${styles.filterControls} ${filtersOpen ? styles.filterControlsOpen : ""}`}
                role={filtersOpen ? "dialog" : undefined}
                aria-labelledby={filtersOpen ? "user-filter-title" : undefined}
              >
                <div className={styles.filterModalHeading}>
                  <h2 id="user-filter-title">Filter users</h2>
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setFiltersOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <Select
                  aria-label="Filter by role"
                  className={styles.filterSelect}
                  classNamePrefix="users-select"
                  isSearchable={false}
                  menuPortalTarget={document.body}
                  options={roleOptions}
                  styles={selectStyles}
                  value={roleOptions.find((option) => option.value === roleFilter)}
                  onChange={(option) => changeFilters({ role: option?.value || "all" })}
                />
                <Select
                  aria-label="Filter by status"
                  className={styles.filterSelect}
                  classNamePrefix="users-select"
                  isSearchable={false}
                  menuPortalTarget={document.body}
                  options={statusOptions}
                  styles={selectStyles}
                  value={statusOptions.find((option) => option.value === statusFilter)}
                  onChange={(option) => changeFilters({ status: option?.value || "all" })}
                />
              </div>
            </OutsideAlerter>
          </div>

          <div className={styles.usersListScroll} id="admin-users-list-scroll">
            <InfiniteScroll
              className={styles.usersTable}
              dataLength={users.length}
              hasMore={Boolean(pagination.hasNextPage)}
              loader={
                <div className={styles.infiniteScrollLoaderRow} role="row">
                  <div role="cell" aria-colspan="7">
                    <InfiniteScrollLoader label="Loading more users…" />
                  </div>
                </div>
              }
              next={loadMoreUsers}
              scrollThreshold="160px"
              scrollableTarget="admin-users-list-scroll"
              role="table"
              aria-label="System users"
            >
              {users.length > 0 && (
                <div className={styles.usersTableHeader} role="row">
                  <div role="columnheader">#</div>
                  <div role="columnheader">Name</div>
                  <div role="columnheader">Email</div>
                  <div role="columnheader">Role</div>
                  <div role="columnheader">Status</div>
                  <div role="columnheader">Joined On</div>
                  <div role="columnheader">Actions</div>
                </div>
              )}
              <div role="rowgroup">
                {users.map((user, index) => {
                  const role = getUserRole(user);
                  const active = user.isActive !== false;
                  return (
                    <div
                      className={styles.userRow}
                      key={user._id}
                      role="row"
                      aria-rowindex={index + 2}
                    >
                      <div role="cell">{index + 1}</div>
                      <div role="cell">
                        <div className={styles.nameCell}>
                          <span className={styles.userAvatar}>
                            {user.name?.trim().charAt(0).toUpperCase() || "?"}
                          </span>
                          <strong>{user.name}</strong>
                        </div>
                      </div>
                      <div className={styles.emailCell} role="cell">{user.email}</div>
                      <div role="cell">
                        <span className={`${styles.roleBadge} ${styles[role]}`}>
                          ♙ {role === "admin" ? "Admin" : "Employee"}
                        </span>
                      </div>
                      <div role="cell">
                        <span className={`${styles.statusBadge} ${active ? styles.active : styles.inactive}`}>
                          <i /> {active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div role="cell">{formatDate(user.createdAt)}</div>
                      <div role="cell">
                        <div className={styles.actions}>
                          <button
                            type="button"
                            aria-label={`Edit ${user.name}`}
                            onClick={() => openEdit(user)}
                          >
                            ✎
                          </button>
                          <button
                            className={styles.deleteAction}
                            type="button"
                            aria-label={`Delete ${user.name}`}
                            disabled={String(user._id) === String(userId)}
                            onClick={() => setDeleteTarget(user)}
                          >
                            <AssetIcon src={trashIcon} size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {loading && users.length === 0 && (
                  <div className={styles.tableMessage} role="row">
                    <div role="cell" aria-colspan="7">Loading users…</div>
                  </div>
                )}
                {!loading && users.length === 0 && (
                  <div className={`${styles.tableMessage} ${styles.emptyUsersMessage}`} role="row">
                    <div role="cell" aria-colspan="7">No users found</div>
                  </div>
                )}
              </div>
            </InfiniteScroll>
          </div>
          {users.length > 0 && (
            <div className={styles.tableFooter}>
              <span>Showing {users.length} of {pagination.total} users</span>
              <span aria-live="polite">
                {pagination.hasNextPage
                  ? "Scroll to load more"
                  : "All users loaded"}
              </span>
            </div>
          )}
        </section>
      </div>

      {modalMode && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className={styles.userModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
          >
            <header className={styles.modalHeader}>
              <span className={styles.modalIcon}>♙</span>
              <div>
                <h2 id="user-modal-title">{modalMode === "edit" ? "Edit User" : "Add User"}</h2>
                <p>{modalMode === "edit" ? "Update the user's details, role and status." : "Create a user account and set their access."}</p>
              </div>
              <button type="button" aria-label="Close dialog" onClick={closeForm} disabled={saving}>×</button>
            </header>
            <form className={styles.userForm} onSubmit={submitForm}>
              <div className={styles.formAvatar} aria-hidden="true">
                {form.name.trim() ? (
                  form.name.trim().charAt(0).toUpperCase()
                ) : (
                  <AssetIcon src={userProfileIcon} size={24} />
                )}
              </div>
              <label>
                <span>Full Name <b>*</b></span>
                <input
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                <span>Email Address <b>*</b></span>
                <input
                  autoComplete="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              {modalMode === "create" && (
                <label>
                  <span>Temporary Password <b>*</b></span>
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    type="password"
                    required
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
              )}
              <div className={styles.formGrid}>
                <label>
                  <span>Role <b>*</b></span>
                  <Select
                    aria-label="User role"
                    classNamePrefix="users-select"
                    isSearchable={false}
                    menuPortalTarget={document.body}
                    options={editRoleOptions}
                    styles={selectStyles}
                    value={editRoleOptions.find((option) => option.value === form.role)}
                    onChange={(option) => setForm((current) => ({ ...current, role: option?.value || "employee" }))}
                  />
                </label>
                <label>
                  <span>Status <b>*</b></span>
                  <Select
                    aria-label="User status"
                    classNamePrefix="users-select"
                    isSearchable={false}
                    menuPortalTarget={document.body}
                    options={editStatusOptions}
                    styles={selectStyles}
                    value={editStatusOptions.find((option) => option.value === (form.isActive ? "active" : "inactive"))}
                    onChange={(option) => setForm((current) => ({ ...current, isActive: option?.value === "active" }))}
                  />
                </label>
              </div>
              {formError && <p className={styles.formError} role="alert">{formError}</p>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={closeForm} disabled={saving}>Cancel</button>
                <button type="submit" className={styles.submitButton} disabled={saving}>
                  {saving ? "Saving…" : modalMode === "edit" ? "Update User" : "Add User"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setDeleteTarget(null);
          }}
        >
          <section
            className={styles.confirmModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            aria-describedby="delete-user-description"
          >
            <span className={styles.deleteIcon}>!</span>
            <h2 id="delete-user-title">Delete user?</h2>
            <p id="delete-user-description">
              {deleteTarget.name} will be permanently removed. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button type="button" className={styles.deleteConfirmButton} onClick={deleteUser} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete User"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}