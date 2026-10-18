import type { ReactNode } from "react";
import styles from "./key-ui.module.css";
import { KeyIntro } from "./KeyIntro";

const DISCORD_INVITE =
  process.env.NEXT_PUBLIC_DISCORD_INVITE || "https://discord.gg/teh6H7q3v6";
const LOGO = "https://i.postimg.cc/0jpcGFjZ/image.png";

export function Shell({
  stepLabel,
  children,
}: {
  stepLabel: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <KeyIntro />
      <div className={styles.frame}>
        <div className={styles.header}>
          <img src={LOGO} alt="Darkson" className={styles.logo} />
          <div className={styles.brandCol}>
            <div className={styles.brand}>DARKSON</div>
            <div className={styles.sub}>Personal workspace</div>
          </div>
          <div className={styles.chip}>{stepLabel}</div>
        </div>

        <div className={styles.body}>{children}</div>

        <div className={styles.foot}>
          Need help ?{" "}
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
            join the Discord server.
          </a>
        </div>
      </div>
    </div>
  );
}
