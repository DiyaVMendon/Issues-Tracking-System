import styles from "./InfiniteScrollLoader.module.css";

export default function InfiniteScrollLoader({ label = "Loading more…" }) {
  return (
    <button
      className={styles.loader}
      type="button"
      disabled
      aria-live="polite"
      aria-label={label}
    >
      <span className={styles.spinner} aria-hidden="true" />
      {label}
    </button>
  );
}
