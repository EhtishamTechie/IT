/**
 * Bot Detection Middleware
 * Detects search engine crawlers and social media bots
 */

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',           // Yahoo
  'duckduckbot',     // DuckDuckGo
  'baiduspider',     // Baidu
  'yandexbot',       // Yandex
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegram',
  'slack',
  'discordbot',
  'pinterestbot',
  'redditbot',
  'applebot',
  'petalbot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'rogerbot',
  'lighthouse',      // Google Lighthouse
  'gtmetrix',
  'pingdom',
  'uptimerobot',
  'crawler',
  'spider',
  'scraper'
];

/**
 * Check if user agent is a bot
 * @param {string} userAgent - The user agent string
 * @returns {boolean} - True if bot, false otherwise
 */
const isBotRequest = (userAgent) => {
  if (!userAgent) return false;
  
  const lowerUA = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => lowerUA.includes(bot));
};

/**
 * Express middleware to detect bots
 * Adds req.isBot flag
 */
const botDetectionMiddleware = (req, res, next) => {
  const userAgent = req.get('user-agent') || '';
  req.isBot = isBotRequest(userAgent);
  
  // Log bot requests for debugging
  if (req.isBot && process.env.NODE_ENV !== 'production') {
    console.log(`🤖 Bot detected: ${userAgent.substring(0, 50)}... accessing ${req.path}`);
  }
  
  next();
};

module.exports = {
  isBotRequest,
  botDetectionMiddleware
};
