import {
  LandmarkIcon,
  MountainSnowIcon,
  SunIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react";
import type { Activity } from "contracts";

type ActivityGlyphProps = {
  activity: Activity;
  className?: string;
};

export function ActivityGlyph({ activity, className }: ActivityGlyphProps) {
  const Icon = ACTIVITY_ICONS[activity];

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full bg-foreground/[0.04] p-1.5 ring-1 ring-foreground/[0.06]",
        className ?? "",
      ].join(" ")}
      aria-hidden="true"
    >
      <Icon strokeWidth={1.25} className="size-full" />
    </span>
  );
}

const ACTIVITY_ICONS: Record<Activity, LucideIcon> = {
  SKIING: MountainSnowIcon,
  SURFING: WavesIcon,
  OUTDOOR_SIGHTSEEING: SunIcon,
  INDOOR_SIGHTSEEING: LandmarkIcon,
};
