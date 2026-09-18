export function isProductChromePath(pathname: string) {
  if (!pathname) return false;
  if (pathname.startsWith("/debug")) return false;
  if (pathname === "/login") return false;
  if (pathname === "/start") return true;
  if (pathname.startsWith("/connect/p/") || pathname.startsWith("/connect/l/")) return false;

  return (
    pathname === "/dashboard" ||
    pathname === "/account" ||
    // Praefix, nicht exakt: /profile hat Unterseiten (der Vergleich), und die
    // gehoeren genauso in die Produkt-Navigation.
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    // Praefix seit 19.09.2026: Jeder Begriff hat eine eigene Seite
    // (/founder-library/<slug>), und die fiel mit dem exakten Vergleich aus der
    // Produkt-Navigation heraus. Sie oeffnet ueblicherweise in einem zweiten
    // Fenster - aber es ist ein zweites Fenster DIESER Anwendung, in dem man
    // weiterarbeiten kann. Eine Seite ohne Leiste waere dort eine Sackgasse.
    pathname.startsWith("/founder-library") ||
    pathname === "/connections" ||
    pathname.startsWith("/advisor/") ||
    pathname.startsWith("/discovery") ||
    pathname.startsWith("/connect") ||
    pathname.startsWith("/me/") ||
    pathname.startsWith("/report/") ||
    pathname.startsWith("/founder-alignment/") ||
    pathname.startsWith("/teams/") ||
    pathname === "/invite/new"
  );
}
