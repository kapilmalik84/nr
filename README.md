# Australia Post Newsroom

AEM Edge Delivery Services (EDS) implementation of the Australia Post Newsroom.

## Live site

- Preview: https://main--nr--kapilmalik84.aem.page/
- Production: *(to be configured)*

## Local development

```bash
npm install
npx @adobe/aem-cli up
```

Open http://localhost:3000 — the local server proxies from DA live content.

## Content

Content is authored in Document Authoring (DA) at https://da.live/#/kapilmalik84/nr

## Structure

| Path | Description |
|---|---|
| `/archive/news/{year}/` | News articles |
| `/section/stamps/{subsection}/{year}/` | Stamps articles |
| `/archive/video/` | Video articles |
| `/nav` | Site navigation (DA) |
| `/footer` | Site footer (DA) |

## Migration scripts

See `scripts-migration/` for tools used to migrate content from the legacy newsroom CMS.
