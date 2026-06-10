import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { FC } from 'react';

import { BottomNav } from '../../navigation/BottomNav/BottomNav';
import styles from './AppShell.module.scss';
import { AppShellProps } from './types';

export const AppShell: FC<AppShellProps> = ({
  title,
  subtitle,
  actions,
  children,
  withoutBack = false,
}) => (
  <>
    <header className={styles.container}>
      <div className={styles.blockLeft}>
        {!withoutBack && (
          <Button
            onClick={() => window.history.back()}
            variant="filled"
            color="default"
          >
            <ArrowLeftOutlined />
          </Button>
        )}
      </div>

      <strong>{title}</strong>

      <div className={styles.blockRight}>{actions}</div>
    </header>

    <main className="app-shell">
      <div className={styles.subTitle}>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>

      {children}
    </main>

    <BottomNav />
  </>
);
