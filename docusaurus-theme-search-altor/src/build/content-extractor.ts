import {load, type CheerioAPI, type Cheerio} from 'cheerio';
import type {Element} from 'domhandler';
import type {DocEntry} from '../options';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getContentRoot($: CheerioAPI): Cheerio<Element> {
  const article = $('article').first();
  if (article.length > 0) {
    return article;
  }

  const main = $('main').first();
  if (main.length > 0) {
    return main;
  }

  return $('[class*="docMainContainer"]').first();
}

async function collectHtmlFiles(directory: string): Promise<string[]> {
  const entries = await fs.promises.readdir(directory, {withFileTypes: true});
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toUrl(outDir: string, filePath: string): string {
  const relativePath = path.relative(outDir, filePath).split(path.sep).join('/');

  if (relativePath === 'index.html') {
    return '/';
  }

  if (relativePath.endsWith('/index.html')) {
    return `/${relativePath.slice(0, -'/index.html'.length)}`;
  }

  if (relativePath.endsWith('.html')) {
    return `/${relativePath.slice(0, -'.html'.length)}`;
  }

  return `/${relativePath}`;
}

function detectType(url: string): DocEntry['type'] {
  if (url === '/docs' || url.startsWith('/docs/')) {
    return 'docs';
  }

  if (url === '/blog' || url.startsWith('/blog/')) {
    return 'blog';
  }

  return 'page';
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function createSections(root: Cheerio<Element>, pageTitle: string): Array<{title: string; content: string; headings: string[]; anchor: string}> {
  const clonedRoot = root.clone();
  const h2Elements = clonedRoot.find('h2');

  if (h2Elements.length === 0) {
    const content = cleanText(clonedRoot.text());
    return content.length > 0
      ? [{title: pageTitle, content, headings: [], anchor: ''}]
      : [];
  }

  const markers: string[] = [];
  const headings: string[] = [];
  h2Elements.each(index => {
    const marker = `__ALTOR_H2_${index}__`;
    const h2 = h2Elements.eq(index);
    markers.push(marker);
    headings.push(cleanText(h2.text()) || pageTitle);
    h2.before(`\n${marker}\n`);
  });

  const rawText = clonedRoot.text();
  const positions = markers
    .map((marker, index) => ({marker, heading: headings[index], position: rawText.indexOf(marker)}))
    .filter(section => section.position >= 0)
    .sort((left, right) => left.position - right.position);

  const introText = positions.length > 0 ? cleanText(rawText.slice(0, positions[0].position)) : '';

  return positions
    .map((section, index) => {
      const nextPosition = positions[index + 1]?.position ?? rawText.length;
      const sectionStart = section.position + section.marker.length;
      const sectionText = cleanText(rawText.slice(sectionStart, nextPosition));
      const content = index === 0 && introText.length > 0 ? cleanText(`${introText} ${sectionText}`) : sectionText;

      if (content.length === 0) {
        return null;
      }

      return {
        title: `${pageTitle} — ${section.heading}`,
        content,
        headings: [section.heading],
        anchor: slugify(section.heading),
      };
    })
    .filter((section): section is {title: string; content: string; headings: string[]; anchor: string} => section !== null);
}

export async function extractContent(outDir: string): Promise<DocEntry[]> {
  const htmlFiles = await collectHtmlFiles(outDir);
  const entries: DocEntry[] = [];
  let nextId = 0;

  for (const htmlFile of htmlFiles) {
    const html = await fs.promises.readFile(htmlFile, 'utf8');
    const $ = load(html);
    const contentRoot = getContentRoot($);

    if (contentRoot.length === 0) {
      continue;
    }

    const sanitizedRoot = contentRoot.clone();
    sanitizedRoot.find('nav, footer, script, style').remove();

    const pageTitle =
      cleanText(sanitizedRoot.find('h1').first().text()) || cleanText($('title').first().text()) || 'Untitled';
    const sections = createSections(sanitizedRoot, pageTitle);
    const url = toUrl(outDir, htmlFile);
    const type = detectType(url);

    for (const section of sections) {
      const sectionUrl = section.anchor ? `${url}#${section.anchor}` : url;
      entries.push({
        id: nextId,
        title: section.title,
        url: sectionUrl,
        content: section.content,
        headings: section.headings,
        snippet: section.content.slice(0, 160),
        type,
      });
      nextId += 1;
    }
  }

  return entries;
}
