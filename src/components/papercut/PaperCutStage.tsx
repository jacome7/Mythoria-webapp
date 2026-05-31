import type { ReactNode } from 'react';
import type { StageAspect, StyleVars } from './types';

/**
 * The scene "stage": a relatively-positioned band with a responsive, locked
 * aspect ratio so its percentage-positioned layers stay pixel-stable. The
 * aspect values feed the `.pc-stage` cascade in globals.css.
 */
export default function PaperCutStage({
  aspect,
  className = '',
  children,
}: {
  aspect: StageAspect;
  className?: string;
  children: ReactNode;
}) {
  const style: StyleVars = {
    '--pc-aspect-base': aspect.base,
    '--pc-aspect-md': aspect.md,
    '--pc-aspect-lg': aspect.lg,
  };

  return (
    <div className={`pc-stage ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
