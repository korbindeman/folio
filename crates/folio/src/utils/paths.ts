// Helper function to split a path into segments
export function getPathSegments(path: string): string[] {
  if (!path || path === "") return [];
  return path.split("/").filter(Boolean);
}

// Helper function to get parent path
export function getParentPath(path: string): string | null {
  if (!path || path === "") return null;
  const segments = getPathSegments(path);
  if (segments.length === 0) return null;
  if (segments.length === 1) return "";
  return segments.slice(0, -1).join("/");
}

// Helper function to build path from segments
export function buildPath(segments: string[]): string {
  return segments.join("/");
}

// Helper function to get the last segment (title) of a path
export function getPathTitle(path: string): string {
  if (!path || path === "") return "Root";
  const segments = getPathSegments(path);
  return segments[segments.length - 1] || "Root";
}
