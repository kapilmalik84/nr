const { Document, Packer, Paragraph, TextRun, ExternalHyperlink } = require('docx');
const fs = require('fs');
const path = require('path');

async function createNav() {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Australia Post Newsroom')], link: '/' })] }),
        new Paragraph({ children: [] }),
        new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Home')], link: '/' })] }),
        new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('News')], link: '/news/' })] }),
        new Paragraph({ children: [new TextRun('General')] }),
        new Paragraph({ children: [new TextRun('Executives')] }),
        new Paragraph({ children: [new TextRun('Speeches')] }),
        new Paragraph({ children: [new TextRun('News Archive')] }),
        new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Stamps')], link: '/stamps/' })] }),
        new Paragraph({ children: [new TextRun('Royal')] }),
        new Paragraph({ children: [new TextRun('Sport')] }),
        new Paragraph({ children: [new TextRun('Arts and Culture')] }),
        new Paragraph({ children: [new TextRun('History')] }),
        new Paragraph({ children: [new TextRun('Indigenous')] }),
        new Paragraph({ children: [new TextRun('Industry')] }),
        new Paragraph({ children: [new TextRun('Legends')] }),
        new Paragraph({ children: [new TextRun('Military')] }),
        new Paragraph({ children: [new TextRun('Natural World')] }),
        new Paragraph({ children: [new TextRun('Stamps Archive')] }),
        new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Video')], link: '/video/' })] }),
        new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('Photos')], link: '/photos/' })] }),
        new Paragraph({ children: [] }),
        new Paragraph({ children: [new TextRun('+61 3 9106 6666 (24/7 National Media Line)')] }),
        new Paragraph({ children: [new ExternalHyperlink({ children: [new TextRun('media@auspost.com.au')], link: 'mailto:media@auspost.com.au' })] }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '..', 'content', 'nav.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${outputPath}`);
}

createNav().catch(console.error);
