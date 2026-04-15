import styles from "./ad-rails.module.css";

type AdRailsProps = {
  children: React.ReactNode;
  railTop?: number;
};

export function AdRails({ children, railTop }: AdRailsProps) {
  return (
    <div className={styles.shell} style={railTop ? ({ ["--rail-top" as string]: `${railTop}px` } as React.CSSProperties) : undefined}>
      <aside className={`${styles.rail} ${styles.leftRail}`} aria-hidden="true">
        <div className={styles.slot}>
          <span className={styles.slotLabel}>Ad Slot</span>
          <strong>Left Banner</strong>
          <p>Google AdSense 또는 제휴 배너를 넣을 자리</p>
        </div>
      </aside>

      <div className={styles.content}>{children}</div>

      <aside className={`${styles.rail} ${styles.rightRail}`} aria-hidden="true">
        <div className={styles.slot}>
          <span className={styles.slotLabel}>Ad Slot</span>
          <strong>Right Banner</strong>
          <p>사이드 광고나 프로모션 배너를 배치할 수 있습니다</p>
        </div>
      </aside>
    </div>
  );
}
