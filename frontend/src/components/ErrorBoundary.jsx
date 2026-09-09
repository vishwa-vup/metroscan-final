// React error boundary: catches render crashes and shows a friendly
// 500-style fallback instead of a blank page. No backend involvement.
import { Component } from "react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="mx-auto max-w-md border-t-2 border-ink px-1 py-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">Something went wrong</p>
        <p className="mt-1 text-xl font-bold tracking-tight text-ink">This screen crashed</p>
        <p className="mt-1 text-sm text-muted">
          Your scans are safe — try again or go back to your dashboard.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => this.setState({ crashed: false })}
            className="h-9 rounded-md border border-rule bg-surface px-4 text-sm font-semibold text-ink hover:bg-tone"
          >
            Try again
          </button>
          <Link to="/login" className="inline-flex h-9 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-white no-underline hover:bg-brand-primaryDark">
            Go to portals
          </Link>
        </div>
      </div>
    );
  }
}
