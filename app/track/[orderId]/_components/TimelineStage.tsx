import Image from 'next/image';
import Symbol from '@/components/ui/Symbol/Symbol';
import type { OrderStatus, OrderPhoto } from '@/lib/types';
import styles from '../page.module.css';

const STAGE_ICONS: Record<OrderStatus, string> = {
  Documented: 'assignment',
  Cutting: 'content_cut',
  Sewing: 'apparel',
  Ready: 'inventory_2',
  Delivered: 'check_circle',
};

const STAGE_HEADLINES: Record<OrderStatus, string> = {
  Documented: 'Documented',
  Cutting: 'Cutting',
  Sewing: 'Sewing',
  Ready: 'Ready',
  Delivered: 'Delivered',
};

const STAGE_STORIES: Record<OrderStatus, string> = {
  Documented: 'Your order has been carefully logged — specifications and measurements recorded.',
  Cutting: 'Patterns drafted and your fabric precision-cut to your exact measurements.',
  Sewing: 'On the machine — every seam stitched with care by your tailor.',
  Ready: 'Finished, pressed and packaged. Ready for pickup or delivery!',
  Delivered: 'Delivered. Thank you for trusting us with your style!',
};

const PENDING_NOTES: Record<OrderStatus, string> = {
  Documented: 'Awaiting intake.',
  Cutting: 'Awaiting pattern drafting and fabric cutting.',
  Sewing: 'Awaiting the sewing bench.',
  Ready: 'Awaiting final finishing and quality checks.',
  Delivered: 'Awaiting handover.',
};

function formatStageDate(d: Date): string {
  const today = new Date();
  const sameDay = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  if (sameDay) return 'Today';
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface TimelineStageProps {
  status: OrderStatus;
  isCompleted: boolean;
  isCurrent: boolean;
  isPending: boolean;
  date: Date | null;
  photos: OrderPhoto[];
  dueDate: string | null | undefined;
  assignedToName?: string;
}

export default function TimelineStage({
  status,
  isCompleted,
  isCurrent,
  isPending,
  date,
  photos,
  dueDate,
  assignedToName,
}: TimelineStageProps) {
  const photo = photos[photos.length - 1];

  return (
    <article className={`${styles.stage} ${isCurrent ? styles.stageCurrent : ''} ${isPending ? styles.stagePending : ''}`}>
      <div className={styles.stageMeta}>
        <div className={`${styles.stageNode} ${isCompleted ? styles.nodeDone : isCurrent ? styles.nodeNow : styles.nodeWait}`}>
          <Symbol
            name={isCompleted ? 'check' : STAGE_ICONS[status]}
            size={isCurrent ? 24 : 20}
            fill={isCompleted}
            className={isCurrent ? styles.nodePulse : undefined}
          />
        </div>
        <div className={styles.stageText}>
          <span className={styles.stageDate}>
            {isCurrent
              ? date ? formatStageDate(date) : 'Today'
              : isCompleted && date
                ? formatStageDate(date)
                : status === 'Ready' && dueDate
                  ? `Est. ${new Date(dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`
                  : 'Up next'}
          </span>
          <h3 className={styles.stageTitle}>{STAGE_HEADLINES[status]}</h3>
          <span className={`${styles.stagePill} ${isCompleted ? styles.pillDone : isCurrent ? styles.pillNow : styles.pillWait}`}>
            {isCompleted ? 'Delivered' : isCurrent ? 'In Progress' : 'Pending'}
          </span>
        </div>
      </div>

      <div className={styles.stageBody}>
        {isPending ? (
          <div className={styles.pendingCard}>
            <Symbol name="hourglass_empty" size={30} className={styles.pendingIcon} />
            <p>{PENDING_NOTES[status]}</p>
          </div>
        ) : photo ? (
          <div className={`${styles.photoCard} ${isCurrent ? styles.photoCardCurrent : ''}`}>
            {isCurrent && (
              <span className={styles.liveTag}>
                <span className={styles.liveTagDot} />
                Live Update
              </span>
            )}
            <Image src={photo.url} alt={`Your garment during ${status}`} width={800} height={600} className={styles.stagePhoto} />
            <div className={styles.photoCaption}>
              <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
              {isCurrent && assignedToName && (
                <p className={styles.captionSub}>{assignedToName} is personally working on your garment.</p>
              )}
            </div>
            {photos.length > 1 && (
              <div className={styles.photoStrip}>
                {photos.slice(0, -1).map((p, i) => (
                  <Image key={i} src={p.url} alt={`${status} photo ${i + 1}`} width={72} height={72} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`${styles.storyCard} ${isCurrent ? styles.photoCardCurrent : ''}`}>
            {isCurrent && (
              <span className={styles.liveTag}>
                <span className={styles.liveTagDot} />
                Live Update
              </span>
            )}
            <Symbol name={STAGE_ICONS[status]} size={30} className={styles.storyIcon} />
            <p className={styles.captionTitle}>{STAGE_STORIES[status]}</p>
            {isCurrent && assignedToName && (
              <p className={styles.captionSub}>{assignedToName} is personally working on your garment.</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
