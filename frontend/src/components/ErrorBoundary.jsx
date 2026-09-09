// React error boundary: catches render crashes and shows a friendly
// 500-style fallback instead of a blank page. No backend involvement.
import { Component } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./icons.jsx";

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
      <div className="mx-auto max-w-md rounded-card border border-slate-200 bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
          <Icon name="issue" />
        </span>
        <p className="mt-3 text-base font-semibold text-ink">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">
          This screen crashed. Your scans are safe — try again or go back to your dashboard.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => this.setState({ crashed: false })}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Try again
          </button>
          <Link to="/login" className="inline-flex h-10 items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white no-underline hover:bg-brand-primaryDark">
            Go to portals
          </Link>
        </div>
      </div>
    );
  }
}
