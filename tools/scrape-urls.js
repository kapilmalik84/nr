/* eslint-disable */
/**
 * Scrape all article URLs from newsroom.auspost.com.au
 * Since pagination uses ASP.NET postback, we scrape what's accessible
 * and also use known URL patterns.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(chunks.join('')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function scrapeSection(sectionUrl) {
  const html = await fetch(sectionUrl);
  const urls = [];
  const regex = /href="(\/[a-z0-9][a-z0-9\-]+[a-z0-9])"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    // Filter out non-article paths
    if (!url.includes('/section') && !url.includes('/photos') &&
        !url.includes('/signup') && !url.includes('/archive') &&
        !url.includes('/assets') && !url.includes('.') &&
        url.length > 5) {
      urls.push(url);
    }
  }
  return [...new Set(urls)];
}

async function main() {
  console.log('Scraping article URLs from newsroom.auspost.com.au...\n');

  const sections = [
    'https://newsroom.auspost.com.au/section/news',
    'https://newsroom.auspost.com.au/section/stamps',
    'https://newsroom.auspost.com.au/section/video',
    'https://newsroom.auspost.com.au/',
  ];

  const allUrls = new Set();

  for (const section of sections) {
    console.log(`Scraping: ${section}`);
    const urls = await scrapeSection(section);
    urls.forEach((u) => allUrls.add(u));
    console.log(`  Found ${urls.length} URLs`);
  }

  // Sort and write to file
  const sorted = [...allUrls].sort();
  const outputPath = path.join(__dirname, '..', 'tools', 'all-urls.txt');
  fs.writeFileSync(outputPath, sorted.map((u) => `https://newsroom.auspost.com.au${u}`).join('\n'));

  console.log(`\nTotal unique article URLs: ${sorted.length}`);
  console.log(`Saved to: ${outputPath}`);

  // Also categorize
  const news = sorted.filter((u) => !u.includes('video') && !u.includes('stamp'));
  const stamps = sorted.filter((u) => u.includes('stamp'));
  const video = sorted.filter((u) => u.includes('video'));

  console.log(`\nBreakdown:`);
  console.log(`  News: ${news.length}`);
  console.log(`  Stamps: ${stamps.length}`);
  console.log(`  Video: ${video.length}`);
}

main().catch(console.error);
