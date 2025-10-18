export function getPathSegments(path: string): string[] {
  if (!path) return [];
  return path.split("/").filter(Boolean);
}

export function getParentPath(path: string): string {
  if (!path) return "";
  const segments = getPathSegments(path);
  if (segments.length <= 1) return "";
  return segments.slice(0, -1).join("/");
}

export function getPathTitle(path: string): string {
  if (!path) return "Root";
  const segments = getPathSegments(path);
  return segments[segments.length - 1] || "Root";
}
