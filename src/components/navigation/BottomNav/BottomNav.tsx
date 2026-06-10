'use client';

import { useI18n } from '@/components/providers/I18nProvider/hooks';
import cn from 'classnames';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAppBootstrap } from '../../../hooks/useAppBootstrap';
import styles from './BottomNav.module.scss';
import { NAV_TABS } from './constants';

export function BottomNav() {
  const pathname = usePathname();

  const { t } = useI18n();
  const { currentCourseId, currentLesson } = useAppBootstrap();
  const hasLearningAccess = Boolean(currentCourseId || currentLesson);

  const visibleTabs = NAV_TABS.filter(
    (tab) => tab.href !== '/lessons' || hasLearningAccess
  );

  return (
    <nav
      aria-label="Bottom navigation"
      className={cn(styles.nav, { [styles.navFour]: visibleTabs.length === 4 })}
    >
      {visibleTabs.map(({ href, label, icon }) => {
        const active =
          pathname === href || (href !== '/home' && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            className={cn(styles.tab, { [styles.tabActive]: active })}
          >
            <span aria-hidden="true" className={styles.icon}>
              {icon}
            </span>

            <span>{t(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
