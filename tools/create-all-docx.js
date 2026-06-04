/* eslint-disable */
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, AlignmentType, LevelFormat, ThematicBreak } = require('docx');
const fs = require('fs');
const path = require('path');

const SITE = 'https://main--newsroom--kapilmalik84.aem.page';
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

// ============ NAV.DOCX ============
async function createNav() {
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'nav-list',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ],
      }],
    },
    sections: [{
      children: [
        // Section 1: Brand
        new Paragraph({ children: [link('Australia Post Newsroom', SITE + '/')] }),

        hr(),

        // Section 2: Nav links as bulleted list
        new Paragraph({ numbering: { reference: 'nav-list', level: 0 }, children: [link('Home', SITE + '/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 0 }, children: [link('News', SITE + '/news/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('General', SITE + '/news/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Executives', SITE + '/news/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Speeches', SITE + '/news/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('News Archive', SITE + '/news/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 0 }, children: [link('Stamps', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Royal', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Sport', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Arts and Culture', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('History', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Indigenous', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Industry', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Legends', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Military', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Natural World', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 1 }, children: [link('Stamps Archive', SITE + '/stamps/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 0 }, children: [link('Video', SITE + '/video/')] }),
        new Paragraph({ numbering: { reference: 'nav-list', level: 0 }, children: [link('Photos', SITE + '/photos/')] }),

        hr(),

        // Section 3: Tools/Contact
        new Paragraph({ children: [new TextRun('+61 3 9106 6666 (24/7 National Media Line)')] }),
        new Paragraph({ children: [link('media@auspost.com.au', 'mailto:media@auspost.com.au')] }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(__dirname, '..', 'content', 'nav.docx'), buffer);
  console.log('Created: content/nav.docx');
}

// ============ FOOTER.DOCX ============
async function createFooter() {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({
            text: "As Australia's postal service for more than 216 years, we're at the heart of every community. Last financial year we delivered 2.2 billion items to 12.8 million delivery points. Australia Post has one of the largest retail networks nationally, with more than 4,000 Post Offices. Australia Post employs people of all ages, genders, and abilities in our extended workforce of more than 64,000 team members, reflective of the diverse communities we operate in. We are proud to be included in the inaugural Indigenous Employment Index with 3% of our workforce identifying as Aboriginal or Torres Strait Islander and we are one of the largest Australian employers to be certified as a Disability Confident Recruiter.",
            italics: true,
          })],
        }),
        new Paragraph({
          children: [
            new TextRun('Copyright © 2026 Australia Post. All Rights Reserved. Our '),
            link('privacy policy', 'https://auspost.com.au/privacy'),
          ],
        }),
        new Paragraph({
          children: [new TextRun('Australia Post acknowledges the Traditional Custodians of the land on which we operate, live and gather as employees, and recognise their continuing connection to land, water and community. We pay respect to Elders past, present and emerging.')],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(__dirname, '..', 'content', 'footer.docx'), buffer);
  console.log('Created: content/footer.docx');
}

// ============ INDEX.DOCX ============
async function createIndex() {
  const heroImg = fs.readFileSync(path.join(__dirname, '..', 'media', 'hero-bg.jpg'));
  const beyondBlueImg = fs.readFileSync(path.join(__dirname, '..', 'media', 'beyond-blue.jpg'));
  const blueyImg = fs.readFileSync(path.join(__dirname, '..', 'media', 'bluey.jpg'));
  const parcelImg = fs.readFileSync(path.join(__dirname, '..', 'media', 'parcel-facility.jpg'));
  const alphaImg = fs.readFileSync(path.join(__dirname, '..', 'media', 'alpha-level.jpg'));
  const pubsImg = fs.readFileSync(path.join(__dirname, '..', 'media', 'publications.jpg'));

  function blockTable(blockName, rows) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: blockName, bold: true })] })],
              columnSpan: 2,
              borders: noBorder,
            }),
          ],
        }),
        ...rows,
      ],
    });
  }

  function imgCell(imgData, w, h) {
    return new TableCell({
      children: [new Paragraph({ children: [new ImageRun({ data: imgData, transformation: { width: w, height: h } })] })],
      borders: noBorder,
    });
  }

  function textCell(paragraphs) {
    return new TableCell({
      children: paragraphs,
      borders: noBorder,
    });
  }

  const doc = new Document({
    sections: [{
      children: [
        // === HERO BLOCK ===
        blockTable('Hero', [
          new TableRow({
            children: [
              imgCell(heroImg, 300, 200),
              textCell([
                new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Welcome to the Australia Post Newsroom')] }),
                new Paragraph({ children: [new TextRun('Get the latest news, media releases, video, audio and images from Australia Post.')] }),
                new Paragraph({ children: [new TextRun('To subscribe click button below.')] }),
                new Paragraph({ children: [link('Subscribe', SITE + '/signup', true)] }),
              ]),
            ],
          }),
        ]),

        hr(),

        // === FEATURED ARTICLE BLOCK ===
        blockTable('Featured Article', [
          new TableRow({
            children: [
              imgCell(beyondBlueImg, 300, 200),
              textCell([
                new Paragraph({ heading: HeadingLevel.HEADING_3, children: [link('Australia Post to deliver its 25 millionth Connection Postcard with Beyond Blue', SITE + '/articles/news/2026/australia-post-to-deliver-its-25-millionth-connection-postcard-with-beyond-blue')] }),
                new Paragraph({ children: [new TextRun('Four million prepaid Connection Postcards are being delivered to letterboxes across the country, as research reveals loneliness is causing distress for one in three Australians.')] }),
                new Paragraph({ children: [link('Read more', SITE + '/articles/news/2026/australia-post-to-deliver-its-25-millionth-connection-postcard-with-beyond-blue', true)] }),
              ]),
            ],
          }),
        ]),

        new Paragraph({ children: [] }),

        // === QUICK LINKS BLOCK ===
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
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
                    new Paragraph({ children: [link('About Us', 'https://auspost.com.au/about-us')] }),
                    new Paragraph({ children: [link('Important updates', 'https://auspost.com.au/service-updates')] }),
                    new Paragraph({ children: [link('Executive Profiles', 'https://auspost.com.au/about-us/corporate-information/executive-leadership-team')] }),
                    new Paragraph({ children: [link('Fast facts', 'https://auspost.com.au/about-us/news-media/fast-facts-about-australia-post')] }),
                    new Paragraph({ children: [link('auspost.com.au', 'https://auspost.com.au/')] }),
                  ],
                  borders: noBorder,
                }),
              ],
            }),
          ],
        }),

        hr(),

        // === LATEST HEADING + ARTICLE CARDS ===
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun('Latest:')] }),

        blockTable('Article Cards', [
          new TableRow({
            children: [
              imgCell(blueyImg, 250, 167),
              textCell([
                new Paragraph({ children: [new TextRun({ text: 'Bluey is back at Australia Post – for real life', bold: true })] }),
                new Paragraph({ children: [new TextRun('Dust off your coin purses Bluey fans - Bluey is back at Australia Post with the very first $2 Bluey Dollarbuck coin collection.')] }),
                new Paragraph({ children: [link('Read more', SITE + '/articles/news/2026/bluey-is-back-at-australia-post-for-real-life')] }),
              ]),
            ],
          }),
          new TableRow({
            children: [
              imgCell(parcelImg, 250, 167),
              textCell([
                new Paragraph({ children: [new TextRun({ text: 'Australia Post statement regarding fuel surcharge - 1 May 2026', bold: true })] }),
                new Paragraph({ children: [new TextRun('Along with many other businesses, Australia Post is regularly reviewing and updating its fuel surcharge to help recover the recent significant increase in fuel costs.')] }),
                new Paragraph({ children: [link('Read more', SITE + '/articles/news/2026/australia-post-statement-regarding-fuel-surcharge-1-may-2026')] }),
              ]),
            ],
          }),
          new TableRow({
            children: [
              imgCell(alphaImg, 250, 167),
              textCell([
                new Paragraph({ children: [new TextRun({ text: 'Australia Post taps global AI expertise to supercharge cyber threat detection', bold: true })] }),
                new Paragraph({ children: [new TextRun('Australia Post is partnering with Alpha Level, a next generation AI security company, to sharpen its cyber defences and speed up threat detection across its network.')] }),
                new Paragraph({ children: [link('Read more', SITE + '/articles/news/2026/australia-post-taps-global-ai-expertise-to-supercharge-cyber-threat-detection')] }),
              ]),
            ],
          }),
          new TableRow({
            children: [
              imgCell(beyondBlueImg, 250, 167),
              textCell([
                new Paragraph({ children: [new TextRun({ text: 'Australia Post to deliver its 25 millionth Connection Postcard with Beyond Blue', bold: true })] }),
                new Paragraph({ children: [new TextRun('Four million prepaid Connection Postcards are being delivered to letterboxes across the country, as research reveals loneliness is causing distress for one in three Australians.')] }),
                new Paragraph({ children: [link('Read more', SITE + '/articles/news/2026/australia-post-to-deliver-its-25-millionth-connection-postcard-with-beyond-blue')] }),
              ]),
            ],
          }),
        ]),

        hr(),

        // === PUBLICATIONS PROMO BLOCK ===
        blockTable('Publications Promo', [
          new TableRow({
            children: [
              imgCell(pubsImg, 250, 167),
              textCell([
                new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun('View our latest publications')] }),
                new Paragraph({ children: [link('Read more', 'https://auspost.com.au/about-us/news-media/publications', true)] }),
              ]),
            ],
          }),
        ]),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(__dirname, '..', 'content', 'index.docx'), buffer);
  console.log('Created: content/index.docx');
}

// Run all
async function main() {
  await createNav();
  await createFooter();
  await createIndex();
  console.log('\nAll files created in content/ folder.');
  console.log('Upload them to your OneDrive AP-Newsroom folder to update the live site.');
}

main().catch(console.error);
