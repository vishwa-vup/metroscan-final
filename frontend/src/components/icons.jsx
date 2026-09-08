// MetroScan icon family (frontend-only): single inline-SVG set, stroke style.
// Replaces scattered emoji so status meaning never depends on emoji fonts.
const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Base({ children, ...rest }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...P} {...rest}>
      {children}
    </svg>
  );
}

export const I = {
  dashboard: (
    <Base><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Base>
  ),
  scans: (
    <Base><path d="M4 6h16M4 12h16M4 18h10" /></Base>
  ),
  capture: (
    <Base><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Base>
  ),
  upload: (
    <Base><path d="M12 16V4m0 0 4 4m-4-4L8 8" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></Base>
  ),
  search: (
    <Base><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></Base>
  ),
  check: (
    <Base><path d="m5 12 5 5 9-11" /></Base>
  ),
  warn: (
    <Base><path d="M12 4 3 20h18z" /><path d="M12 10v4m0 3v.5" /></Base>
  ),
  issue: (
    <Base><circle cx="12" cy="12" r="8" /><path d="M12 8v5m0 3v.5" /></Base>
  ),
  unknown: (
    <Base><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7m0 3v.5" /></Base>
  ),
  logout: (
    <Base><path d="M14 4H6v16h8" /><path d="m10 12 7 0m0 0 3-3m-3 3 3 3" /></Base>
  ),
  plus: (
    <Base><path d="M12 5v14M5 12h14" /></Base>
  ),
  file: (
    <Base><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></Base>
  ),
  clock: (
    <Base><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></Base>
  ),
};

export function Icon({ name, className = "" }) {
  return <span aria-hidden="true" className={`inline-flex shrink-0 ${className}`}>{I[name] || I.file}</span>;
}
