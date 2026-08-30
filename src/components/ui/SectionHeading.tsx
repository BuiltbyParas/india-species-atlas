import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  as: Tag = 'h2',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto max-w-2xl text-center', 'max-w-3xl', className)}>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-forest-400">{eyebrow}</p>
      )}
      <Tag className="font-serif text-2xl font-semibold leading-tight text-canvas sm:text-3xl">{title}</Tag>
      {description && <p className="mt-3 text-sm leading-relaxed text-canvas/70 sm:text-base">{description}</p>}
    </div>
  );
}
