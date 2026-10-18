import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`page-heading ${className}`}>
      <div className="page-heading-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {meta ? <div className="header-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

