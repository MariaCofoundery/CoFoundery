export function isProductChromePath(pathname: string) {
  if (!pathname) return false;
  if (pathname.startsWith("/debug")) return false;
  if (pathname === "/login") return false;
  if (pathname === "/start") return true;

  return (
    pathname === "/dashboard" ||
    pathname === "/account" ||
    pathname === "/founder-library" ||
    pathname === "/connections" ||
    pathname.startsWith("/advisor/") ||
    pathname.startsWith("/discovery") ||
    pathname.startsWith("/network") ||
    pathname.startsWith("/me/") ||
    pathname.startsWith("/report/") ||
    pathname.startsWith("/founder-alignment/") ||
    pathname.startsWith("/teams/") ||
    pathname === "/invite/new"
  );
}
