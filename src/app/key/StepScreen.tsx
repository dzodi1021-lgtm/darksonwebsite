import type { ReactNode } from "react";
import styles from "./key-ui.module.css";
import { CopyKey } from "./CopyKey";

interface Props {
  title: string;
  subtitle?: string;
  progressPct: number;
  progressLabel: string;
  button?: { href: string; text: string } | null;
  keyValue?: string | null;
  showSteps?: boolean;
  statusRight?: ReactNode;
}

export function StepScreen({
  title,
  subtitle,
  progressPct,
  progressLabel,
  button,
  keyValue,
  showSteps,
  statusRight,
}: Props) {
  return (
    <div className={styles.content}>
      <div className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.desc}>{subtitle}</p> : null}

        {showSteps ? (
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepText}>
                Hit the button. Once you press <b>Get my key</b> it&apos;ll take
                you to work.ink.
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepText}>
                Finish the work.ink and you get sent back to the Darkson key
                system automatically.
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepText}>
                Then do all the steps (there are 2) to get your key.
              </div>
            </div>
          </div>
        ) : null}

        {button ? (
          <div className={styles.cta}>
            <a className={styles.btn} href={button.href}>
              <span>{button.text}</span>
              <span className={styles.arrow}>→</span>
            </a>
          </div>
        ) : null}

        {keyValue ? (
          <div className={styles.keyBox}>
            <div className={styles.keyLabel}>Your key</div>
            <div className={styles.keyValue}>{keyValue}</div>
            <CopyKey value={keyValue} />
            <div className={styles.hint}>
              Copy &amp; paste it into your Roblox UI. It binds to your HWID on
              first use.
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.side}>
        <div className={styles.kicker}>Status</div>
        <div className={styles.progressBox}>
          <div className={styles.progressHead}>
            <span>{progressLabel}</span>
            <span>{progressPct}%</span>
          </div>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        {statusRight ? (
          <div className={styles.statusList}>{statusRight}</div>
        ) : null}
      </div>
    </div>
  );
}

export function BypassScreen() {
  return (
    <div className={styles.bypass}>
      <div className={styles.dangerBar}>Protection • Access denied</div>
      <h1 className={styles.bypassTitle}>Access denied</h1>
      <p className={styles.bypassDesc}>
        You failed your attempt to bypass the key system. Please restart from
        the beginning.
      </p>
      <div className={styles.cta}>
        <a className={styles.btn} href="/key?step=0">
          <span>Restart key system</span>
          <span className={styles.arrow}>→</span>
        </a>
      </div>
    </div>
  );
}
