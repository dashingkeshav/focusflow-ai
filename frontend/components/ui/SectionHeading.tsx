import type { ReactNode } from "react";
import Reveal from "./Reveal";

interface SectionHeadingProps {
  label: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
}

export default function SectionHeading({
  label,
  title,
  description,
  align = "center",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <Reveal className={centered ? "text-center" : ""}>
      <span className="section-label">{label}</span>
      <h2 className="section-title" style={centered ? { marginInline: "auto" } : undefined}>
        {title}
      </h2>
      {description && (
        <p
          className="section-description"
          style={centered ? { marginInline: "auto" } : undefined}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
