/** Frontend state tests (§32.15): server-rendered assertions, no browser needed. */
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ConfidenceBadge from "./components/ConfidenceBadge.jsx";
import OcrFieldList from "./components/OcrFieldList.jsx";
import StatusBadge from "./components/StatusBadge.jsx";
import { EmptyState, ErrorBanner, LoadingState } from "./components/feedback.jsx";

describe("StatusBadge (five states, text + icon)", () => {
  const cases = [
    ["VERIFIED_APPEARS_COMPLIANT", "Verified / appears compliant"],
    ["POTENTIAL_NON_COMPLIANCE", "Potential non-compliance"],
    ["COULD_NOT_RELIABLY_VERIFY", "Could not reliably verify"],
    ["INSPECTOR_CONFIRMED_ISSUE", "Inspector-confirmed issue"],
    ["INSPECTOR_CONFIRMED_COMPLIANT", "Inspector-confirmed compliant"],
  ];
  for (const [status, label] of cases) {
    it(`renders ${status} with text label`, () => {
      const html = renderToString(<StatusBadge status={status} />);
      expect(html).toContain(label);
    });
  }
});

describe("OcrFieldList (never invents values)", () => {
  it("shows the could-not-verify wording for missing fields", () => {
    const html = renderToString(
      <OcrFieldList fields={{ mrp: { value_raw: "", ocr_confidence: 0 } }} />,
    );
    expect(html).toContain("could not be verified from the provided image");
  });
  it("shows raw value plus confidence for present fields", () => {
    const html = renderToString(
      <OcrFieldList fields={{ mrp: { value_raw: "Rs 99", value_normalized: "99.00 INR", ocr_confidence: 0.92, candidates: [] } }} />,
    );
    expect(html).toContain("Rs 99");
    expect(html).toContain("92%");
  });
});

describe("ConfidenceBadge (threshold honesty)", () => {
  it("flags below-threshold confidence for verification", () => {
    const html = renderToString(<ConfidenceBadge value={0.45} />);
    expect(html).toContain("45%");
    expect(html).toContain("verify");
  });
});

describe("feedback states", () => {
  it("loading, empty and error render accessibly", () => {
    expect(renderToString(<LoadingState />)).toContain('role="status"');
    expect(renderToString(<EmptyState what="none" />)).toContain("none");
    expect(renderToString(<ErrorBanner message="boom" />)).toContain('role="alert"');
  });
});
