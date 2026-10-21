import type { VehicleImage } from "@/lib/types";

/** Shows the car's photo, or an on-brand placeholder until photos are uploaded. */
export function CarPhoto({
  image,
  alt,
  placeholder,
  className = "",
  priority = false,
  tint,
}: {
  image?: VehicleImage;
  alt: string;
  placeholder: string;
  className?: string;
  priority?: boolean;
  /** Paint colour for the placeholder silhouette, so the colour picker is visible before photos exist. */
  tint?: string;
}) {
  if (image) {
    return (
      // Plain <img> keeps it simple while images come from our own storage/CDN.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.url}
        alt={image.alt ?? alt}
        loading={priority ? "eager" : "lazy"}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#1d1b18_0%,#111113_100%)] ${className}`}
    >
      <svg
        viewBox="0 0 88 40"
        fill="none"
        aria-hidden="true"
        className={tint ? "w-1/2 max-w-[360px] transition-[fill] duration-300" : "w-[88px] opacity-40"}
      >
        <path
          d="M10 28c0-4 2-7 7-8l10-8c3-2 6-3 10-3h14c4 0 7 1 10 3l10 8c5 1 7 4 7 8z"
          fill={tint ?? "none"}
          stroke="#c9a66b"
          strokeWidth={tint ? 0.6 : 1.4}
          strokeLinejoin="round"
        />
        <path d="M6 28h76" stroke="#c9a66b" strokeWidth={tint ? 0.6 : 1.4} strokeLinecap="round" />
        <circle cx="24" cy="29" r="5" fill={tint ? "#0b0b0c" : "none"} stroke="#c9a66b" strokeWidth={tint ? 0.6 : 1.4} />
        <circle cx="64" cy="29" r="5" fill={tint ? "#0b0b0c" : "none"} stroke="#c9a66b" strokeWidth={tint ? 0.6 : 1.4} />
      </svg>
      <span className="sr-only">{placeholder}</span>
    </div>
  );
}
