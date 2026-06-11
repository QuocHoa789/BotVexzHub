const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');

const TOKEN = '';
const CLIENT_ID = '';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ──────────────────── PROXY LIST ────────────────────
const PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

// ──────────────────── HELPER FUNCTIONS ────────────────────
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchUrl(url, method) {
  const proxyUrl = PROXIES[method] + encodeURIComponent(url);
  try {
    const res = await axios.get(proxyUrl, {
      timeout: 15000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36'
      },
      maxRedirects: 5,
      responseType: 'text'
    });
    return { text: res.data, url: res.request?.res?.responseUrl || url, status: res.status };
  } catch (err) {
    throw new Error(`Request failed: ${err.message}`);
  }
}

function extractLinks(html) {
  const found = [];
  const patterns = [
    /window\.location\.href\s*=\s*["'`]([^"'`]+)["'`]/gi,
    /window\.location\.replace\s*\(\s*["'`]([^"'`]+)["'`]\)/gi,
    /location\.href\s*=\s*["'`]([^"'`]+)["'`]/gi,
    /location\.replace\s*\(\s*["'`]([^"'`]+)["'`]\)/gi,
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["']\d+;\s*url=([^"'>\s]+)/gi,
    /(?:redirectTo|navigateTo|goTo|redirectUrl|targetUrl|finalUrl|destUrl)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi,
    /data-url\s*=\s*["'`]([^"'`]+)["'`]/gi,
    /data-redirect\s*=\s*["'`]([^"'`]+)["'`]/gi,
    /data-link\s*=\s*["'`]([^"'`]+)["'`]/gi,
    /fetch\s*\(\s*["'`]([^"'`]+)["'`]\)/gi,
    /["'`](https?:\/\/[^"'`\s]*(?:api|auth|verify|checkpoint|complete|finish|key|token|done|success)[^"'`\s]*)["'`]/gi,
    /<a[^>]+href\s*=\s*["'`]([^"'`]+)["'`][^>]*>(?:[^<]*(?:get\s*key|continue|next|proceed|download|verify|complete|skip|claim)[^<]*)<\/a>/gi,
  ];

  patterns.forEach(pat => {
    let m;
    while ((m = pat.exec(html)) !== null) {
      const link = m[1];
      if (link && link.length > 3 && !found.includes(link)) {
        found.push(link);
      }
    }
  });

  return found;
}

function extractKey(text) {
  const patterns = [
    /FREE_[a-fA-F0-9]{20,40}/g,
    /key[=:]\s*["'`]?([a-zA-Z0-9_]{20,60})["'`]?/gi,
    /Key:\s*["'`]?([a-zA-Z0-9_]{20,60})/gi,
    /["'`]([a-zA-Z0-9_]{32,})["'`]/g,
  ];

  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const k = m[1] || m[0];
      if (k && k.length >= 20 && !k.includes('http') && !k.includes('function') && !k.includes('script')) {
        return k.startsWith('FREE_') ? k : `FREE_${k}`;
      }
    }
  }

  return null;
}

function extractKeyFromUrl(url) {
  try {
    return extractKey(decodeURIComponent(url));
  } catch {
    return null;
  }
}

async function processUrl(url, depth, method, logCallback) {
  if (depth > 8) {
    logCallback('⚠️ Quá 8 redirect, dừng', 'warn');
    return null;
  }

  logCallback(`🔍 Depth ${depth}: ${url.substring(0, 90)}`, 'info');

  try {
    const resp = await fetchUrl(url, method);
    const html = resp.text || '';
    const finalUrl = resp.url || url;

    logCallback(`✅ Status: ${resp.status} | Size: ${html.length} bytes`, 'info');

    if (html.length === 0) {
      logCallback('⚠️ Response rỗng, thử method khác...', 'warn');
      if (method < 2) return processUrl(url, depth, method + 1, logCallback);
      return null;
    }

    // Check key in URL
    const keyFromUrl = extractKeyFromUrl(finalUrl);
    if (keyFromUrl) {
      logCallback('🔑 Tìm thấy key trong URL!', 'success');
      return keyFromUrl;
    }

    // Check key in body
    const keyFromBody = extractKey(html);
    if (keyFromBody) {
      logCallback('🔑 Tìm thấy key trong body!', 'success');
      return keyFromBody;
    }

    // Extract and follow links
    const links = extractLinks(html);
    logCallback(`📎 Tìm thấy ${links.length} link`, 'info');

    const priority = links.filter(l =>
      l.includes('api') || l.includes('checkpoint') || l.includes('verify') ||
      l.includes('complete') || l.includes('key') || l.includes('auth') ||
      l.includes('done') || l.includes('success') || l.includes('claim')
    );
    const normal = links.filter(l => !priority.includes(l));
    const sorted = [...priority, ...normal].filter(l =>
      !l.startsWith('javascript:') && !l.startsWith('#') && l.length > 1
    );

    for (const link of sorted) {
      let fullUrl;
      try {
        fullUrl = new URL(link, finalUrl).href;
      } catch {
        if (link.startsWith('http')) fullUrl = link;
        else continue;
      }

      if (fullUrl === url || fullUr
