import { isNative } from "@/lib/platform";

/**
 * Convert dynamic route paths to query-param paths for native Capacitor app.
 * Web version uses the original paths unchanged.
 */
export function nativeHref(href: string): string {
  if (!isNative()) return href;

  // /bag/[clubId]/maintenances/[maintenanceId]/edit
  let match = href.match(/^\/bag\/([^/]+)\/maintenances\/([^/]+)\/edit$/);
  if (match) return `/bag/detail/maintenances/detail/edit?clubId=${match[1]}&maintenanceId=${match[2]}`;

  // /bag/[clubId]/maintenances/[maintenanceId]
  match = href.match(/^\/bag\/([^/]+)\/maintenances\/([^/]+)$/);
  if (match) return `/bag/detail/maintenances/detail?clubId=${match[1]}&maintenanceId=${match[2]}`;

  // /bag/[clubId]/maintenances?add=1
  match = href.match(/^\/bag\/([^/]+)\/maintenances(\?.*)?$/);
  if (match) return `/bag/detail/maintenances?id=${match[1]}${match[2] ? "&" + match[2].slice(1) : ""}`;

  // /bag/[clubId]/memos/[memoId]/edit
  match = href.match(/^\/bag\/([^/]+)\/memos\/([^/]+)\/edit$/);
  if (match) return `/bag/detail/memos/detail/edit?clubId=${match[1]}&memoId=${match[2]}`;

  // /bag/[clubId]/memos/[memoId]
  match = href.match(/^\/bag\/([^/]+)\/memos\/([^/]+)$/);
  if (match) return `/bag/detail/memos/detail?clubId=${match[1]}&memoId=${match[2]}`;

  // /bag/[clubId]/memos?add=1
  match = href.match(/^\/bag\/([^/]+)\/memos(\?.*)?$/);
  if (match) return `/bag/detail/memos?id=${match[1]}${match[2] ? "&" + match[2].slice(1) : ""}`;

  // /bag/[clubId]/edit
  match = href.match(/^\/bag\/([^/]+)\/edit$/);
  if (match) return `/bag/detail/edit?id=${match[1]}`;

  // /bag/[clubId]
  match = href.match(/^\/bag\/([^/]+)$/);
  if (match && match[1] !== "detail") return `/bag/detail?id=${match[1]}`;

  // /practice/[sessionId]/edit
  match = href.match(/^\/practice\/([^/]+)\/edit$/);
  if (match) return `/practice/detail/edit?id=${match[1]}`;

  // /practice/[sessionId]
  match = href.match(/^\/practice\/([^/]+)$/);
  if (match && match[1] !== "detail" && match[1] !== "new") return `/practice/detail?id=${match[1]}`;

  // /items/[id]
  match = href.match(/^\/items\/([^/]+)$/);
  if (match && match[1] !== "detail" && match[1] !== "new") return `/items/detail?id=${match[1]}`;

  // /courses/[courseId]
  match = href.match(/^\/courses\/([^/]+)$/);
  if (match && match[1] !== "detail") return `/courses/detail?id=${match[1]}`;

  // /coach/plans/[planId]
  match = href.match(/^\/coach\/plans\/([^/]+)$/);
  if (match && match[1] !== "detail" && match[1] !== "new") return `/coach/plans/detail?id=${match[1]}`;

  // /admin/knowledge/[id]
  match = href.match(/^\/admin\/knowledge\/([^/]+)$/);
  if (match && match[1] !== "detail") return `/admin/knowledge/detail?id=${match[1]}`;

  return href;
}
