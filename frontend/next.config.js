/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: 'https://conetwork-booking-platform.onrender.com',
  },
}
module.exports = nextConfig 
 
