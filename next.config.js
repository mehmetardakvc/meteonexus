const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Geliştirme aşamasında (npm run dev) yavaşlatmaması için kapalıdır, canlıda çalışır
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Buraya ileride başka Next.js ayarları eklemek istersen yazabilirsin
};

module.exports = withPWA(nextConfig);