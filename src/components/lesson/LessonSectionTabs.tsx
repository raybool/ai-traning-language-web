import Link from 'next/link';
import React from 'react';

import { LessonSectionType } from '../../lib/api';
import { useI18n } from '../providers/I18nProvider';
import styles from './LessonSectionTabs.module.scss';

const defs: Array<{
  key: LessonSectionType;
  label: string;
  emoji: string;
  href: string;
}> = [
  {
    key: 'rules',
    label: 'rules',
    emoji: '📘',
    href: '/lesson/{lessonId}/rules',
  },
  {
    key: 'words',
    label: 'vocabulary',
    emoji: '🧠',
    href: '/lesson/{lessonId}/vocabulary',
  },
  {
    key: 'dialogues',
    label: 'dialogues',
    emoji: '💬',
    href: '/lesson/{lessonId}/dialogue',
  },
  // {
  //   key: 'listening',
  //   label: 'listening',
  //   emoji: '🎧',
  //   href: '/lesson/{lessonId}/listening',
  // },
];

const getDefs = (lessonId: number) =>
  defs.map((x) => ({
    ...x,
    href: x.href.replace('{lessonId}', String(lessonId)),
  }));

type Props = {
  lessonId: number;
};

export const LessonSectionTabs: React.FC<Props> = ({ lessonId }) => {
  const { t } = useI18n();

  const fullDefs = getDefs(lessonId);

  return (
    <div className={styles.container}>
      {fullDefs.map((item) => (
        <Link key={item.key} href={item.href} className={styles.tab}>
          {item.emoji} {t(item.key)}
        </Link>
      ))}
    </div>
  );
};
