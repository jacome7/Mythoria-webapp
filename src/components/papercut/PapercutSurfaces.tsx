import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import styles from './PapercutSurfaces.module.css';

type PageVariant = 'standard' | 'wide' | 'reader' | 'editor' | 'legal' | 'auth';
type CardTone = 'warm' | 'blue' | 'accent' | 'success' | 'danger';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function papercutScopeClassName(...classes: Array<string | false | null | undefined>) {
  return cx(styles.scope, ...classes);
}

export function PapercutPage({
  children,
  variant = 'standard',
  className,
  ...props
}: ComponentPropsWithoutRef<'div'> & { variant?: PageVariant }) {
  return (
    <div className={cx(styles.scope, styles[variant], className)} {...props}>
      <div className={styles.page}>{children}</div>
    </div>
  );
}

export function PapercutHeroBand({
  title,
  subtitle,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'header'> & {
  title?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <header className={cx(styles.card, styles.heroBand, className)} {...props}>
      {title ? <h1>{title}</h1> : null}
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </header>
  );
}

export function PapercutCard({
  children,
  tone = 'warm',
  className,
  ...props
}: ComponentPropsWithoutRef<'div'> & { tone?: CardTone }) {
  return (
    <div className={cx(styles.card, tone !== 'warm' && styles[tone], className)} {...props}>
      {children}
    </div>
  );
}

export function PapercutToolbar({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cx(styles.toolbar, className)} {...props}>
      {children}
    </div>
  );
}

export function PapercutEmptyState({
  title,
  description,
  icon = '?',
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'section'> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className={cx(styles.card, styles.emptyState, className)} {...props}>
      <div className={styles.emptyStateIcon} aria-hidden="true">
        {icon}
      </div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  );
}

export const papercutStyles = styles;
