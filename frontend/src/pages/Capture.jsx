import { useState } from "react";
import { useLocation } from "react-router-dom";
import CameraCapture from "../components/CameraCapture.jsx";
import { PageHeading, SecondaryLink, TextLink } from "../components/ui.jsx";

export default function Capture() {
  const { pathname } = useLocation();
  const userPortal = pathname.startsWith("/user");
  const [captured, setCaptured] = useState(false);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageHeading
        kicker="Field action / Capture"
        title="Capture label"
        actions={<SecondaryLink to={userPortal ? "/user/upload" : "/upload"} className="h-8 px-3 text-[13px]">File upload instead</SecondaryLink>}
      />
      <CameraCapture onCapture={() => setCaptured(true)} />
      <p className="border-t border-rule pt-3 text-[13px] leading-relaxed text-muted">
        {captured ? (
          <>Image captured on this device. <TextLink to={userPortal ? "/user/upload" : "/upload"}>Upload it</TextLink> to run quality gate, OCR and rule analysis.</>
        ) : (
          "No image yet — start the camera or choose from the gallery."
        )}
      </p>
    </div>
  );
}
