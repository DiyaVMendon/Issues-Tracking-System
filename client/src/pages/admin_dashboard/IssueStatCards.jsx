import AssetIcon from "../../components/AssetIcon";

export default function IssueStatCards({ items, loading, styles, label }) {
  return (
    <section className={styles.statsGrid} aria-label={label}>
      {items.map(({ label: itemLabel, value, icon, variant }) => (
        <article
          className={`${styles.statCard} ${styles[variant]}`}
          key={variant}
        >
          <div className={styles.statIcon}>
            <AssetIcon src={icon} />
          </div>
          <p>{itemLabel}</p>
          <strong>{loading ? "—" : value}</strong>
        </article>
      ))}
    </section>
  );
}
