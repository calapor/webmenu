const nextConfig = {
  allowedDevOrigins: ['*'],
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  env: {
    APP_VERSION: process.env.APP_VERSION,
  },
}
export default nextConfig
