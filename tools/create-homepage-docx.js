const { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } = require('docx');
const fs = require('fs');
const https = require('https');
const path = require('path');

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function createHomepage() {
  // Download hero image
  const heroImage = fs.readFileSync(path.join(__dirname, '..', 'media', 'hero-bg.jpg'));
  const beyondBlueImage = fs.readFileSync(path.join(__dirname, '..', 'media', 'beyond-blue.jpg'));
  const blueyImage = fs.readFileSync(path.join(__dirname, '..', 'media', 'bluey.jpg'));
  const parcelImage = fs.readFileSync(path.join(__dirname, '..', 'media', 'parcel-facility.jpg'));
  const alphaImage = fs.readFileSync(path.join(__dirname, '..', 'media', 'alpha-level.jpg'));
  const pubsImage = fs.readFileSync(path.join(__dirname, '..', 'media', 'publications.jpg'));

  const noBorder = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

  const doc = new Document({
    sections: [
      {
        children: [
          // --- HERO BLOCK TABLE ---
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Hero', bold: true })] })],
                    columnSpan: 2,
                    borders: noBorder,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new ImageRun({ data: heroImage, transformation: { width: 600, height: 400 } })],
                      }),
                    ],
                    borders: noBorder,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Welcome to the Australia Post Newsroom')] }),
                      new Paragraph({ children: [new TextRun('Get the latest news, media releases, video, audio and images from Australia Post.')] }),
                      new Paragraph({ children: [new TextRun('To subscribe click button below.')] }),
                      new Paragraph({
                        children: [
                          new ExternalHyperlink({ children: [new TextRun({ text: 'Subscribe', bold: true })], link: '/signup' }),
                        ],
                      }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Section break (empty paragraph)
          new Paragraph({ children: [] }),
          new Paragraph({ children: [new TextRun('---')] }),
          new Paragraph({ children: [] }),

          // --- FEATURED ARTICLE BLOCK TABLE ---
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Featured Article', bold: true })] })],
                    columnSpan: 2,
                    borders: noBorder,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new ImageRun({ data: beyondBlueImage, transformation: { width: 400, height: 300 } })],
                      }),
                    ],
                    borders: noBorder,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        heading: HeadingLevel.HEADING_3,
                        children: [
                          new ExternalHyperlink({
                            children: [new TextRun('Australia Post to deliver its 25 millionth Connection Postcard with Beyond Blue')],
                            link: '/articles/news/2026/australia-post-to-deliver-its-25-millionth-connection-postcard-with-beyond-blue',
                          }),
                        ],
                      }),
                      new Paragraph({ children: [new TextRun('Four million prepaid Connection Postcards are being delivered to letterboxes across the country, as research reveals loneliness is causing distress for one in three Australians.')] }),
                      new Paragraph({
                        children: [
                          new ExternalHyperlink({
                            children: [new TextRun({ text: 'Read more', bold: true })],
                            link: '/articles/news/2026/australia-post-to-deliver-its-25-millionth-connection-postcard-with-beyond-blue',
                          }),
                        ],
                      }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          new Paragraph({ children: [] }),

          // --- QUICK LINKS BLOCK TABLE ---
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Quick Links', bold: true })] })],
                    borders: noBorder,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun({ text: 'Quick links', bold: true })] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('About Us')], link: 'https://auspost.com.au/about-us' })] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Important updates')], link: 'https://auspost.com.au/service-updates' })] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Executive Profiles')], link: 'https://auspost.com.au/about-us/corporate-information/executive-leadership-team' })] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Fast facts')], link: 'https://auspost.com.au/about-us/news-media/fast-facts-about-australia-post' })] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('auspost.com.au')], link: 'https://auspost.com.au/' })] }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Section break
          new Paragraph({ children: [] }),
          new Paragraph({ children: [new TextRun('---')] }),
          new Paragraph({ children: [] }),

          // --- LATEST HEADING ---
          new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('Latest:')] }),

          // --- ARTICLE CARDS BLOCK TABLE ---
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Article Cards', bold: true })] })],
                    columnSpan: 2,
                    borders: noBorder,
                  }),
                ],
              }),
              // Card 1
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new ImageRun({ data: blueyImage, transformation: { width: 300, height: 200 } })] })],
                    borders: noBorder,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Bluey is back at Australia Post – for real life', bold: true })] }),
                      new Paragraph({ children: [new TextRun('Dust off your coin purses Bluey fans - Bluey is back at Australia Post with the very first $2 Bluey Dollarbuck coin collection.')] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Read more')], link: '/articles/news/2026/bluey-is-back-at-australia-post-for-real-life' })] }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
              // Card 2
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new ImageRun({ data: parcelImage, transformation: { width: 300, height: 200 } })] })],
                    borders: noBorder,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Australia Post statement regarding fuel surcharge - 1 May 2026', bold: true })] }),
                      new Paragraph({ children: [new TextRun('Along with many other businesses, Australia Post is regularly reviewing and updating its fuel surcharge to help recover the recent significant increase in fuel costs.')] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Read more')], link: '/articles/news/2026/australia-post-statement-regarding-fuel-surcharge-1-may-2026' })] }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
              // Card 3
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new ImageRun({ data: alphaImage, transformation: { width: 300, height: 200 } })] })],
                    borders: noBorder,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Australia Post taps global AI expertise to supercharge cyber threat detection', bold: true })] }),
                      new Paragraph({ children: [new TextRun('Australia Post is partnering with Alpha Level, a next generation AI security company, to sharpen its cyber defences and speed up threat detection across its network.')] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Read more')], link: '/articles/news/2026/australia-post-taps-global-ai-expertise-to-supercharge-cyber-threat-detection' })] }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
              // Card 4
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new ImageRun({ data: beyondBlueImage, transformation: { width: 300, height: 200 } })] })],
                    borders: noBorder,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: 'Australia Post to deliver its 25 millionth Connection Postcard with Beyond Blue', bold: true })] }),
                      new Paragraph({ children: [new TextRun('Four million prepaid Connection Postcards are being delivered to letterboxes across the country, as research reveals loneliness is causing distress for one in three Australians.')] }),
                      new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Read more')], link: '/articles/news/2026/australia-post-to-deliver-its-25-millionth-connection-postcard-with-beyond-blue' })] }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),

          // Section break
          new Paragraph({ children: [] }),
          new Paragraph({ children: [new TextRun('---')] }),
          new Paragraph({ children: [] }),

          // --- PUBLICATIONS PROMO BLOCK TABLE ---
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Publications Promo', bold: true })] })],
                    columnSpan: 2,
                    borders: noBorder,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new ImageRun({ data: pubsImage, transformation: { width: 300, height: 200 } })] })],
                    borders: noBorder,
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun('View our latest publications')] }),
                      new Paragraph({
                        children: [new ExternalHyperlink({ children: [new TextRun({ text: 'Read more', bold: true })], link: 'https://auspost.com.au/about-us/news-media/publications' })],
                      }),
                    ],
                    borders: noBorder,
                  }),
                ],
              }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'content', 'index.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${outputPath}`);
  console.log('Upload this file to your Google Drive folder to publish the homepage.');
}

createHomepage().catch(console.error);
