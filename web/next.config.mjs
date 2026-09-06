import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = {
  async redirects() {
    // The Network area became Connect. Beta members still hold /network
    // bookmarks, and magic links already sent carry next=/network/...
    // Temporary on purpose: nothing was ever indexed under /network, and a 308
    // would stick in browser caches long after these paths stop mattering.
    return [
      { source: "/network", destination: "/connect", permanent: false },
      { source: "/network/:path*", destination: "/connect/:path*", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
