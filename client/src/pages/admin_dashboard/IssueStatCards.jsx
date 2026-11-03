
import AssetIcon from "../../components/AssetIcon";
import {
  ArrowUpRight,
  CircleCheck,
  Clock3,
  Layers3,
} from "lucide-react";

const cardConfig = {
  totalCard: {
    Icon: Layers3,
    description: "Total tracked issues",
  },
  openCard: {
    Icon: Clock3,
    description: "Awaiting action",
  },
  progressCard: {
    Icon: ArrowUpRight,
    description: "Currently being worked on",
  },
  closedCard: {
    Icon: CircleCheck,
    description: "Successfully resolved",
  },
};

export default function IssueStatCards({
  items,
  loading,
  styles,
  label,
}) {
  return (
    <section className={styles.statsGrid} aria-label={label}>
      {items.map(({ label: itemLabel, value, icon, variant }) => {
        const config = cardConfig[variant] || cardConfig.totalCard;
        const Icon = config.Icon;

        return (
          <article
            className={`${styles.statCard} ${styles[variant] || ""}`}
            key={variant}
          >
            <div className={styles.statCardTop}>
              <div className={styles.statIcon}>
                {icon ? (
                  <AssetIcon src={icon} />
                ) : (
                  <Icon size={22} />
                )}
              </div>

              <span className={styles.statCardIndicator}>
                <Icon size={15} />
              </span>
            </div>

            <div className={styles.statCardContent}>
              <p className={styles.statCardLabel}>
                {itemLabel}
              </p>

              <strong className={styles.statCardValue}>
                {loading ? "—" : value}
              </strong>

              <span className={styles.statCardDescription}>
                {config.description}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
