import type { VehicleImage } from "@/lib/types";

/** Shows the car's photo, or an on-brand placeholder until photos are uploaded. */
export function CarPhoto({
  image,
  alt,
  placeholder,
  className = "",
  priority = false,
}: {
  image?: VehicleImage;
  alt: string;
  placeholder: string;
  className?: string;
  priority?: boolean;
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
      <svg width="88" height="40" viewBox="0 0 88 40" fill="none" aria-hidden="true" className="opacity-40">
        <path
          d="M6 28h76M10 28c0-4 2-7 7-8l10-8c3-2 6-3 10-3h14c4 0 7 1 10 3l10 8c5 1 7 4 7 8"
          stroke="#c9a66b"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="29" r="5" stroke="#c9a66b" strokeWidth="1.4" />
        <circle cx="64" cy="29" r="5" stroke="#c9a66b" strokeWidth="1.4" />
      </svg>
      <span className="sr-only">{placeholder}</span>
    </div>
  );
}
