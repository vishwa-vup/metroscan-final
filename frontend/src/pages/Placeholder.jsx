import { PageHeading } from "../components/ui.jsx";

export default function Placeholder({ title, hint }) {
  return (
    <div className="space-y-4">
      <PageHeading kicker="Administration" title={title} sub={hint} />
    </div>
  );
}
