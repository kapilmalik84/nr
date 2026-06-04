/* eslint-disable */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } = require('docx');
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = path.join(__dirname, '..', 'sharepoint-content');
const SITE = 'https://main--newsroom--kapilmalik84.aem.page';

const noBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(chunks.join('')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').trim();
}

function parseArticle(html, url) {
  // Title
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = h1Match ? stripHtml(h1Match[1]) : 'Untitled';

  // Date
  const dateMatch = html.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})/i);
  const date = dateMatch ? dateMatch[1] : '';

  // Year
  let year = '2026';
  if (date) {
    const ym = date.match(/20\d{2}/);
    if (ym) year = ym[0];
  }

  // Category
  let category = 'news';
  if (url.includes('video') || url.includes('Video')) category = 'video';
  else if (url.includes('stamp') || url.includes('Stamp')) category = 'stamps';

  // Body paragraphs (from first section div)
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  const mainHtml = mainMatch ? mainMatch[1] : html;

  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = pRegex.exec(mainHtml)) !== null) {
    const text = stripHtml(m[1]);
    if (text && text !== title && !text.startsWith('INSERT IMAGE')) {
      paragraphs.push(text);
    }
  }

  // Slug
  const slug = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '').replace(/\/$/, '') || 'untitled';

  return { title, date, year, category, paragraphs, slug };
}

async function createDocx(article, outputPath) {
  const children = [];

  if (article.date) {
    children.push(new Paragraph({ children: [new TextRun({ text: article.date, color: '666666', size: 20 })] }));
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(article.title)] }));

  article.paragraphs.forEach((p) => {
    children.push(new Paragraph({ children: [new TextRun(p)] }));
  });

  children.push(new Paragraph({ thematicBreak: true }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Australia Post 24/7 National Media Line', bold: true })] }));
  children.push(new Paragraph({ children: [new TextRun('Phone +613 9106 6666 | Email media@auspost.com.au')] }));

  const doc = new Document({ sections: [{ children }] });
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

async function main() {
  const urlsFile = path.join(__dirname, 'all-urls.txt');
  const urls = fs.readFileSync(urlsFile, 'utf8').trim().split('\n');

  console.log(`Processing ${urls.length} article URLs...\n`);

  let success = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const html = await fetch(url);
      const article = parseArticle(html, url);

      const outputPath = path.join(OUTPUT_DIR, 'articles', article.category, article.year, `${article.slug}.docx`);
      await createDocx(article, outputPath);
      success++;
      console.log(`✓ [${article.category}/${article.year}] ${article.slug}`);
    } catch (err) {
      failed++;
      console.log(`✗ ${url} — ${err.message}`);
    }
  }

  console.log(`\n--- Done ---`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);

  // Show folder structure
  console.log('\nFolder structure:');
  const categories = ['news', 'stamps', 'video'];
  categories.forEach((cat) => {
    const catDir = path.join(OUTPUT_DIR, 'articles', cat);
    if (fs.existsSync(catDir)) {
      const years = fs.readdirSync(catDir).filter((f) => fs.statSync(path.join(catDir, f)).isDirectory());
      years.forEach((y) => {
        const files = fs.readdirSync(path.join(catDir, y)).filter((f) => f.endsWith('.docx'));
        if (files.length > 0) console.log(`  articles/${cat}/${y}/ — ${files.length} files`);
      });
    }
  });
}

main().catch(console.error);
