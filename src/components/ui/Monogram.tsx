export function Monogram({ name, size }: { name: string; size: "sm" | "lg" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "?";
  return <span className="cress-monogram" data-size={size} aria-hidden="true">{initials}</span>;
}
