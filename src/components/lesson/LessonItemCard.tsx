import { LessonItem, LessonItemStatus } from '../../lib/api';
import { useI18n } from '../providers/I18nProvider';
import { Badge } from '../ui/Badge';
import { PrimaryButton } from '../ui/PrimaryButton';
import { RoundedCard } from '../ui/RoundedCard';
import styles from './LessonItemCard.module.scss';

function textFromContent(content: Record<string, unknown>): string {
  const text = content.text;
  return typeof text === 'string' ? text : '';
}

function exampleFromContent(content: Record<string, unknown>): string {
  const text = content.example;
  return typeof text === 'string' ? text : '';
}

export function LessonItemCard({
  item,
  showTranslation,
  onStatus,
  onOpen,
  openLabel,
}: {
  item: LessonItem;
  showTranslation: boolean;
  onStatus: (status: LessonItemStatus) => void;
  onOpen?: () => void;
  openLabel?: string;
}) {
  const text = textFromContent(item.content);
  const example = exampleFromContent(item.content);
  const isKnown = item.status === 'known';

  const { t } = useI18n();

  return (
    <RoundedCard>
      <div className={`row ${styles.header}`}>
        <strong className={styles.title}>{item.title}</strong>
        <div className={styles.headerRight}>
          <Badge
            tone={
              item.status === 'known'
                ? 'success'
                : item.status === 'learning'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {t(item.status)}
          </Badge>
          <label
            className={`${styles.checkboxLabel}${isKnown ? ` ${styles.checkboxLabelKnown}` : ''}`}
          >
            <input
              type="checkbox"
              aria-label="Mark as known"
              checked={isKnown}
              onChange={(event) =>
                onStatus(event.target.checked ? 'known' : 'new')
              }
              className={styles.checkboxInput}
            />
            {isKnown ? (
              <span aria-hidden="true" className={styles.checkmark} />
            ) : null}
          </label>
        </div>
      </div>
      {text ? <p className={styles.text}>{text}</p> : null}
      {example ? (
        <p className={`muted ${styles.text}`}>Example: {example}</p>
      ) : null}
      {showTranslation && item.translate ? (
        <p className={styles.translation}>Translation: {item.translate}</p>
      ) : null}
      {onOpen ? (
        <div className={styles.actions}>
          <PrimaryButton styleType="ghost" onClick={onOpen}>
            {openLabel ?? 'Open'}
          </PrimaryButton>
        </div>
      ) : null}
    </RoundedCard>
  );
}
