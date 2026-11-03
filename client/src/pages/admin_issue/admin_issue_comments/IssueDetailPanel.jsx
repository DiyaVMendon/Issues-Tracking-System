import { useEffect, useState } from "react";
import Select from "react-select";
import { axiosRequest } from "../../../api/axiosRequest";
import AssetIcon from "../../../components/AssetIcon";
import trashIcon from "../../../assets/icons/trash.svg";
import styles from "./issue_detail_panel.module.css";

const statusOptions = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "In Progress" },
  { value: "Closed", label: "Closed" },
];

const priorityOptions = [
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const getStatusValue = (status = "") => {
  const normalized = status.trim().toLowerCase().replaceAll("_", " ");
  if (["in progress", "in-progress"].includes(normalized)) return "In Progress";
  if (["closed", "resolved", "done"].includes(normalized)) return "Closed";
  return "Open";
};

const getPriorityValue = (priority = "") =>
  priorityOptions.find(
    (option) => option.value.toLowerCase() === priority.toLowerCase(),
  )?.value || "Medium";

const formatDate = (value, includeTime = false) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
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

const getIssueCode = (issue) => {
  const id = issue?._id || issue?.id || "";
  return id ? `#ISS-${String(id).slice(-5).toUpperCase()}` : "#ISS";
};

const getAssignee = (issue) =>
  typeof issue?.assigned_to === "object"
    ? issue.assigned_to?.name || "Unassigned"
    : "Unassigned";

const getAssigneeId = (issue) =>
  typeof issue?.assigned_to === "object"
    ? issue.assigned_to?._id || ""
    : issue?.assigned_to || "";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 32,
    borderColor: state.isFocused
      ? "#8c69e2"
      : "var(--theme-border-strong, #dedeea)",
    borderRadius: 7,
    backgroundColor: "var(--theme-surface-input, #fff)",
    color: "var(--theme-text, #39384f)",
    boxShadow: state.isFocused ? "0 0 0 3px rgb(112 72 213 / 14%)" : "none",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 10,
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    "&:hover": {
      borderColor: state.isFocused ? "#8c69e2" : "var(--theme-border-strong, #dedeea)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    minWidth: 0,
    padding: "0 9px",
  }),
  singleValue: (base) => ({
    ...base,
    overflow: "hidden",
    color: "var(--theme-text, #39384f)",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--theme-text-secondary, #77768c)",
  }),
  input: (base) => ({
    ...base,
    color: "var(--theme-text, #39384f)",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 8px",
    color: "var(--theme-text-secondary, #77768c)",
    "&:hover": { color: "#8c69e2" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  menuPortal: (base) => ({ ...base, zIndex: 10020 }),
  menu: (base) => ({
    ...base,
    zIndex: 10020,
    backgroundColor: "var(--theme-surface-raised, #fff)",
    border: "1px solid var(--theme-border-strong, #dedeea)",
    borderRadius: 8,
    boxShadow: "0 10px 24px rgb(20 16 40 / 20%)",
    overflow: "hidden",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: 160,
    padding: 3,
    scrollbarColor: "var(--theme-border-strong, #dedeea) transparent",
    scrollbarWidth: "thin",
  }),
  option: (base, state) => ({
    ...base,
    minHeight: 28,
    borderRadius: 4,
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 10,
    lineHeight: 1.2,
    padding: "6px 8px",
    transition: "background-color 100ms ease, color 100ms ease",
    backgroundColor: state.isSelected
      ? "#7048d5"
      : state.isFocused
        ? "var(--theme-hover, #f3edff)"
        : "var(--theme-surface-raised, #fff)",
    color: state.isSelected
      ? "#fff"
      : "var(--theme-text, #39384f)",
    cursor: "pointer",
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "var(--theme-text-secondary, #77768c)",
    fontSize: 11,
  }),
};

export default function IssueDetailPanel({
  issue,
  isAdmin = false,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onAdminUpdate,
  assigneeOptions = [],
  onAttachmentRemoved,
  onEmployeeStatusSave,
  saving = false,
  error = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSubsection, setMenuSubsection] = useState("");
  const [employeeStatus, setEmployeeStatus] = useState(
    getStatusValue(issue?.status),
  );
  const [employeeDueDate, setEmployeeDueDate] = useState(
    toDateInput(issue?.due_date),
  );
  const [activityTab, setActivityTab] = useState("comments");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [removingAttachment, setRemovingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const issueId = issue?._id || issue?.id;

  useEffect(() => {
    if (!imagePreviewOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setImagePreviewOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [imagePreviewOpen]);

  useEffect(() => {
    if (!issueId) return undefined;

    let active = true;

    axiosRequest(`/issues/${encodeURIComponent(issueId)}/comments`)
      .then((response) => {
        if (active) setComments(Array.isArray(response.data) ? response.data : []);
      })
      .catch((requestError) => {
        if (!active) return;
        setCommentsError(
          requestError.response?.data?.message || "Could not load comments.",
        );
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [issueId]);

  if (!issue) return null;

  const submitComment = async (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || commentSubmitting) return;

    setCommentSubmitting(true);
    setCommentsError("");
    try {
      const response = await axiosRequest(
        `/issues/${encodeURIComponent(issueId)}/comments`,
        { text },
        "POST",
        {},
        { skipLoader: true },
      );
      setComments((current) => [...current, response.data]);
      setCommentText("");
    } catch (requestError) {
      setCommentsError(
        requestError.response?.data?.message || "Could not add comment.",
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const adminUpdate = (patch) => {
    setMenuOpen(false);
    setMenuSubsection("");
    onAdminUpdate?.(patch);
  };

  const removeAttachment = async () => {
    if (!issueId || removingAttachment) return;
    if (!window.confirm("Delete this image attachment from the issue?")) return;
    setRemovingAttachment(true);
    setAttachmentError("");
    try {
      const response = await axiosRequest(
        `/issues/${encodeURIComponent(issueId)}/attachment`,
        null,
        "DELETE",
      );
      onAttachmentRemoved?.(response.data);
      setImagePreviewOpen(false);
    } catch (requestError) {
      setAttachmentError(
        requestError.response?.data?.message ||
          "Could not remove the attachment. Please try again.",
      );
    } finally {
      setRemovingAttachment(false);
    }
  };

  return (
    <aside
      className={`${styles.detailPanel} ${isAdmin ? styles.adminDetailPanel : styles.employeeDetailPanel}`}
      aria-label="Issue details"
    >
      <header className={styles.panelHeader}>
        <div className={styles.issueHeading}>
          <span className={styles.issueCode}>{getIssueCode(issue)}</span>
          <h2>{issue.issue_title || "Untitled issue"}</h2>
        </div>
        <div className={styles.headerActions}>
          {isAdmin && (
            <>
              <button
                className={styles.editButton}
                type="button"
                onClick={onEdit}
                disabled={saving}
              >
                <span aria-hidden="true">✎</span> Edit
              </button>
              <div className={styles.menuWrap}>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label="Issue actions"
                  aria-expanded={menuOpen}
                  onClick={() => {
                    setMenuOpen((current) => !current);
                    setMenuSubsection("");
                  }}
                  disabled={saving}
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className={styles.actionMenu}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDuplicate?.();
                      }}
                    >
                      ▣ <span>Duplicate Issue</span>
                    </button>
                    <button
                      type="button"
                      aria-expanded={menuSubsection === "status"}
                      onClick={() =>
                        setMenuSubsection((current) =>
                          current === "status" ? "" : "status",
                        )
                      }
                    >
                      ◉ <span>Change Status</span> <b>›</b>
                    </button>
                    {menuSubsection === "status" && (
                      <div className={styles.submenu}>
                        {statusOptions.map((option) => (
                          <button
                            type="button"
                            key={option.value}
                            onClick={() => adminUpdate({ status: option.value })}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      aria-expanded={menuSubsection === "priority"}
                      onClick={() =>
                        setMenuSubsection((current) =>
                          current === "priority" ? "" : "priority",
                        )
                      }
                    >
                      ⌃ <span>Change Priority</span> <b>›</b>
                    </button>
                    {menuSubsection === "priority" && (
                      <div className={styles.submenu}>
                        {priorityOptions.map((option) => (
                          <button
                            type="button"
                            key={option.value}
                            onClick={() =>
                              adminUpdate({ priority: option.value })
                            }
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      className={styles.deleteAction}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete?.();
                      }}
                    >
                      ⌫ <span>Delete Issue</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Close issue details"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>

      <div className={styles.metadataGrid}>
        <div className={styles.metadataField}>
          <span>Status</span>
          {isAdmin ? (
            <Select
              aria-label="Change issue status"
              isSearchable={false}
              menuPortalTarget={document.body}
              options={statusOptions}
              styles={selectStyles}
              value={statusOptions.find(
                (option) => option.value === getStatusValue(issue.status),
              )}
              onChange={(option) => {
                if (option) adminUpdate({ status: option.value });
              }}
            />
          ) : (
            <span className={`${styles.valueBadge} ${styles[getStatusValue(issue.status).replace(" ", "").toLowerCase()]}`}>
              {getStatusValue(issue.status)}
            </span>
          )}
        </div>
        <div className={styles.metadataField}>
          <span>Priority</span>
          {isAdmin ? (
            <Select
              aria-label="Change issue priority"
              isSearchable={false}
              menuPortalTarget={document.body}
              options={priorityOptions}
              styles={selectStyles}
              value={priorityOptions.find(
                (option) => option.value === getPriorityValue(issue.priority),
              )}
              onChange={(option) => {
                if (option) adminUpdate({ priority: option.value });
              }}
            />
          ) : (
            <span className={`${styles.valueBadge} ${styles[getPriorityValue(issue.priority).toLowerCase()]}`}>
              {getPriorityValue(issue.priority)}
            </span>
          )}
        </div>
        <div className={styles.metadataField}>
          <span>Assigned To</span>
          {isAdmin ? (
            <Select
              aria-label="Change issue assignee"
              isDisabled={saving}
              isSearchable
              menuPortalTarget={document.body}
              options={assigneeOptions}
              placeholder="Select an assignee"
              styles={selectStyles}
              value={assigneeOptions.find(
                (option) => String(option.value) === String(getAssigneeId(issue)),
              ) || null}
              onChange={(option) => {
                if (option) adminUpdate({ assigned_to: option.value });
              }}
            />
          ) : (
            <strong>{getAssignee(issue)}</strong>
          )}
        </div>
        <div className={styles.metadataField}>
          <span>Due Date</span>
          <strong>{formatDate(issue.due_date)}</strong>
        </div>
      </div>

      <div className={styles.detailContent}>
        <h3>Description</h3>
        <p className={styles.description}>
          {issue.description || "No description provided."}
        </p>
        <h3>Attachments ({issue.issue_image ? 1 : 0})</h3>
        {issue.issue_image ? (
          <div className={styles.attachment}>
            <div className={styles.attachmentPreview}>
              <button
                className={styles.attachmentImageButton}
                type="button"
                onClick={() => setImagePreviewOpen(true)}
                aria-label="Preview issue attachment"
              >
                <img src={issue.issue_image} alt="Issue attachment" />
              </button>
              <button
                className={styles.deleteAttachmentIcon}
                type="button"
                disabled={removingAttachment}
                onClick={removeAttachment}
                aria-label="Delete issue attachment"
                title="Delete image"
              >
                <AssetIcon src={trashIcon} size={14} />
              </button>
            </div>
            <span>View attachment</span>
            {attachmentError && (
              <p className={styles.attachmentError} role="alert">
                {attachmentError}
              </p>
            )}
          </div>
        ) : (
          <p className={styles.muted}>No attachments for this issue.</p>
        )}
      </div>

      {imagePreviewOpen && issue.issue_image && (
        <div
          className={styles.imagePreviewBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setImagePreviewOpen(false);
            }
          }}
        >
          <section
            className={styles.imagePreviewDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Issue attachment preview"
          >
            <button
              className={styles.imagePreviewClose}
              type="button"
              onClick={() => setImagePreviewOpen(false)}
              aria-label="Close image preview"
            >
              ×
            </button>
            <img src={issue.issue_image} alt="Issue attachment preview" />
          </section>
        </div>
      )}

      <nav className={styles.detailTabs} aria-label="Issue information">
        <button
          className={activityTab === "comments" ? styles.selectedTab : ""}
          type="button"
          onClick={() => setActivityTab("comments")}
        >
          ▣ Comments ({comments.length})
        </button>
        <button
          className={activityTab === "activity" ? styles.selectedTab : ""}
          type="button"
          onClick={() => setActivityTab("activity")}
        >
          ◷ Activity
        </button>
      </nav>

      {activityTab === "comments" ? (
        <section className={styles.commentsSection} aria-label="Issue comments">
          <div className={styles.commentsList} aria-live="polite">
            {commentsLoading ? (
              <p className={styles.muted}>Loading comments…</p>
            ) : comments.length ? (
              comments.map((comment) => {
                const author = comment.author;
                const authorName =
                  typeof author === "object" ? author?.name || "User" : "User";
                const avatar = typeof author === "object" ? author?.avatar : "";
                return (
                  <article className={styles.comment} key={comment._id}>
                    {avatar ? (
                      <img
                        className={styles.commentAvatar}
                        src={avatar}
                        alt=""
                      />
                    ) : (
                      <span className={styles.commentAvatar}>
                        {authorName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className={styles.commentBody}>
                      <div className={styles.commentMeta}>
                        <strong>{authorName}</strong>
                        <time>{formatDate(comment.createdAt, true)}</time>
                      </div>
                      <p>{comment.text}</p>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className={styles.muted}>No comments yet. Start the conversation.</p>
            )}
          </div>
          {commentsError && (
            <p className={styles.error} role="alert">{commentsError}</p>
          )}
          <form className={styles.commentForm} onSubmit={submitComment}>
            <textarea
              aria-label="Add a comment"
              maxLength={2000}
              placeholder="Add a comment..."
              rows={2}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              disabled={commentSubmitting || commentsLoading}
            />
            <button
              type="submit"
              aria-label="Send comment"
              disabled={
                !commentText.trim() || commentSubmitting || commentsLoading
              }
            >
              ➤
            </button>
          </form>
        </section>
      ) : (
        <div className={styles.activityList}>
          <article>
            <span className={styles.activityAvatar}>
              {getAssignee(issue).charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{getAssignee(issue)}</strong>
              <time>{formatDate(issue.createdAt, true)}</time>
              <p>Issue created</p>
            </div>
          </article>
          {issue.updatedAt && issue.updatedAt !== issue.createdAt && (
            <article>
              <span className={styles.activityAvatar}>↻</span>
              <div>
                <strong>IssueTracker</strong>
                <time>{formatDate(issue.updatedAt, true)}</time>
                <p>Issue details were last updated</p>
              </div>
            </article>
          )}
        </div>
      )}

      {!isAdmin && (
        <div className={styles.employeeActions}>
          <label>
            <span>Update status</span>
            <Select
              aria-label="Update issue status"
              isSearchable={false}
              menuPortalTarget={document.body}
              options={statusOptions}
              styles={selectStyles}
              value={statusOptions.find(
                (option) => option.value === employeeStatus,
              )}
              onChange={(option) =>
                setEmployeeStatus(option?.value || employeeStatus)
              }
            />
          </label>
          <label>
            <span>Due date</span>
            <input
              type="date"
              value={employeeDueDate}
              onChange={(event) => setEmployeeDueDate(event.target.value)}
            />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button
            className={styles.saveButton}
            type="button"
            disabled={
              saving ||
              (employeeStatus === getStatusValue(issue.status) &&
                employeeDueDate === toDateInput(issue.due_date))
            }
            onClick={() =>
              onEmployeeStatusSave?.(employeeStatus, employeeDueDate)
            }
          >
            {saving ? "Saving…" : "Save status"}
          </button>
        </div>
      )}
      {isAdmin && error && <p className={styles.error} role="alert">{error}</p>}
    </aside>
  );
}
