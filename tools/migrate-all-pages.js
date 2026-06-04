/* eslint-disable */
/**
 * Migrate all pages from newsroom.auspost.com.au to .docx files
 * organized in year-based folders under sharepoint-content/
 */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } = require('docx');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SITE = 'https://main--newsroom--kapilmalik84.aem.page';
const SOURCE = 'https://newsroom.auspost.com.au';
const OUTPUT_DIR = path.join(__dirname, '..', 'sharepoint-content');

const noBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

function hr() {
  return new Paragraph({ thematicBreak: true });
}

function link(text, url, bold = false) {
  return new ExternalHyperlink({
    children: [new TextRun({ text, bold })],
    link: url,
  });
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(chunks.join('')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Parse article HTML into paragraphs for docx
 */
function parseArticleHtml(html) {
  const paragraphs = [];

  // Extract title
  const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/s);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';

  // Extract date from metadata or content
  const dateMatch = html.match(/class="article-date"[^>]*>([^<]+)/);
  const date = dateMatch ? dateMatch[1].trim() : '';

  // Extract body paragraphs
  const bodyMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  const body = bodyMatch ? bodyMatch[1] : html;

  // Get all <p> content
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  const bodyTexts = [];
  while ((match = pRegex.exec(body)) !== null) {
    let text = match[1]
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '_$1_')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (text) bodyTexts.push(text);
  }

  return { title, date, bodyTexts };
}

/**
 * Create a simple article .docx from parsed content
 */
async function createArticleDocx(articleData, outputPath) {
  const { title, date, bodyTexts } = articleData;

  const children = [];

  // Add date if available
  if (date) {
    children.push(new Paragraph({ children: [new TextRun({ text: date, italics: true })] }));
  }

  // Add title as H1
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }));

  // Add body paragraphs
  bodyTexts.forEach((text) => {
    // Handle bold markers
    const runs = [];
    const parts = text.split(/(\*\*.*?\*\*)/);
    parts.forEach((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
      } else if (part.startsWith('[') && part.includes('](')) {
        // Simple link parsing
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          // Can't easily add hyperlinks in runs, just add as text
          runs.push(new TextRun(linkMatch[1]));
        } else {
          runs.push(new TextRun(part));
        }
      } else {
        runs.push(new TextRun(part));
      }
    });
    children.push(new Paragraph({ children: runs }));
  });

  // Add media contact section
  children.push(hr());
  children.push(new Paragraph({ children: [new TextRun({ text: 'Australia Post 24/7 National Media Line', bold: true })] }));
  children.push(new Paragraph({ children: [new TextRun('Phone +613 9106 6666 | Email media@auspost.com.au')] }));

  const doc = new Document({ sections: [{ children }] });

  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

/**
 * Determine the year from the article URL or date
 */
function getYear(url, html) {
  // Try to extract year from URL
  const urlYearMatch = url.match(/\/20(2[3-9])/);
  if (urlYearMatch) return `20${urlYearMatch[1]}`;

  // Try from date in content
  const dateMatch = html.match(/(20[2-9]\d)/);
  if (dateMatch) return dateMatch[1];

  return '2026'; // default
}

/**
 * Determine category from URL
 */
function getCategory(url, html) {
  if (url.includes('/video') || url.includes('video-')) return 'video';
  if (url.includes('/stamps') || url.includes('stamp')) return 'stamps';
  return 'news';
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('Starting migration...');
  console.log('Output directory:', OUTPUT_DIR);

  // Create folder structure
  const dirs = [
    'articles/news/2023', 'articles/news/2024', 'articles/news/2025', 'articles/news/2026',
    'articles/stamps/2023', 'articles/stamps/2024', 'articles/stamps/2025', 'articles/stamps/2026',
    'articles/video/2024', 'articles/video/2025', 'articles/video/2026',
    'news', 'stamps', 'video',
  ];
  dirs.forEach((d) => fs.mkdirSync(path.join(OUTPUT_DIR, d), { recursive: true }));

  // Get existing HTML articles from sharepoint-content/articles/
  const articlesDir = path.join(OUTPUT_DIR, 'articles');
  const existingHtmlFiles = [];

  // Scan the flat articles directory for existing .html files
  const flatArticlesDir = path.join(__dirname, '..', 'sharepoint-content', 'articles');
  if (fs.existsSync(flatArticlesDir)) {
    fs.readdirSync(flatArticlesDir).forEach((file) => {
      if (file.endsWith('.html')) {
        existingHtmlFiles.push(path.join(flatArticlesDir, file));
      }
    });
  }

  console.log(`Found ${existingHtmlFiles.length} existing HTML articles to convert`);

  let converted = 0;
  for (const htmlFile of existingHtmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const slug = path.basename(htmlFile, '.html');
    const category = getCategory(slug, html);
    const year = getYear(slug, html);

    const articleData = parseArticleHtml(html);
    const outputPath = path.join(OUTPUT_DIR, 'articles', category, year, `${slug}.docx`);

    await createArticleDocx(articleData, outputPath);
    converted++;
    if (converted % 10 === 0) console.log(`  Converted ${converted}/${existingHtmlFiles.length}...`);
  }

  console.log(`\nConverted ${converted} articles to .docx`);

  // Also copy the listing pages and other pages
  // index.docx, nav.docx, footer.docx already exist in content/
  const contentDir = path.join(__dirname, '..', 'content');
  if (fs.existsSync(path.join(contentDir, 'index.docx'))) {
    fs.copyFileSync(path.join(contentDir, 'index.docx'), path.join(OUTPUT_DIR, 'index.docx'));
    console.log('Copied index.docx');
  }
  if (fs.existsSync(path.join(contentDir, 'nav.docx'))) {
    fs.copyFileSync(path.join(contentDir, 'nav.docx'), path.join(OUTPUT_DIR, 'nav.docx'));
    console.log('Copied nav.docx');
  }
  if (fs.existsSync(path.join(contentDir, 'footer.docx'))) {
    fs.copyFileSync(path.join(contentDir, 'footer.docx'), path.join(OUTPUT_DIR, 'footer.docx'));
    console.log('Copied footer.docx');
  }

  console.log('\nMigration complete!');
  console.log('Upload the sharepoint-content/ folder contents to your OneDrive folder.');
}

migrate().catch(console.error);
