const { Document, Packer, Paragraph, TextRun, ExternalHyperlink } = require('docx');
const fs = require('fs');
const path = require('path');

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
            new ExternalHyperlink({ children: [new TextRun('privacy policy')], link: 'https://auspost.com.au/privacy' }),
          ],
        }),
        new Paragraph({
          children: [new TextRun('Australia Post acknowledges the Traditional Custodians of the land on which we operate, live and gather as employees, and recognise their continuing connection to land, water and community. We pay respect to Elders past, present and emerging.')],
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'content', 'footer.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${outputPath}`);
}

createFooter().catch(console.error);
