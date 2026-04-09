/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => ({
    beforeFiles: [
      {
        source: '/api/:path*',
        destination: 'https://recruito-ai-production.up.railway.app/api/:path*'
      }
    ]
  })
}

module.exports = nextConfig