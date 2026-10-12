import { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import { findBookImage, isUsableImage } from 'src/core/database/book-images';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';

const SEARCH_TERMS = [
  'harry potter',
  'el principito',
  'el señor de los anillos',
  'lord of the rings',
  'javascript',
  'comic',
  'sherlock holmes',
  'ethereum',
  'deep web',
  'shakespeare',
];
const PAGES_PER_TERM = 3;
const PAGE_SIZE = 40;
const MAX_TEXT_LENGTH = 10000;

interface GoogleVolume {
  volumeInfo?: {
    title?: string;
    description?: string;
    authors?: string[];
    categories?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string };
  };
  saleInfo?: { listPrice?: { amount?: number } };
}

function capitalize(value: string): string {
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function imageFor(volume: GoogleVolume): Promise<string | undefined> {
  const isbns = (volume.volumeInfo?.industryIdentifiers ?? [])
    .filter((id) => id.type.startsWith('ISBN'))
    .map((id) => id.identifier);
  console.log(
    `    ISBNs: ${isbns.length ? isbns.join(', ') : 'none'} | Google thumbnail: ${
      volume.volumeInfo?.imageLinks?.thumbnail ?? 'none'
    }`,
  );
  return findBookImage({
    isbns,
    googleThumbnail: volume.volumeInfo?.imageLinks?.thumbnail,
  });
}

function readingTime(pageCount: number): string {
  if (!pageCount) {
    return 'Cannot estimate reading time';
  }
  const totalHours = (300 * pageCount) / 250 / 60;
  const hours = Math.trunc(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  return `${hours} hs and ${minutes} minutes`;
}

async function fetchVolumes(
  term: string,
  page: number,
): Promise<GoogleVolume[]> {
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', term);
  url.searchParams.set('printType', 'books');
  url.searchParams.set('maxResults', String(PAGE_SIZE));
  url.searchParams.set('startIndex', String(page * PAGE_SIZE));
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GOOGLE_BOOKS_API_KEY is not set. Create a key in Google Cloud Console and add it to api/.env',
    );
  }
  url.searchParams.set('key', apiKey);
  console.log(`\n=== Google Books: "${term}" page ${page + 1} ===`);
  let response: Response | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await fetch(url);
    console.log(
      `Response status: ${response.status} ${response.statusText} (attempt ${attempt + 1})`,
    );
    if (response.status < 500) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
  }
  if (!response?.ok) {
    throw new Error(
      `Google Books request failed (${response?.status}) for "${term}"`,
    );
  }
  const body = (await response.json()) as { items?: GoogleVolume[] };
  console.log(`Received ${body.items?.length ?? 0} volumes`);
  return body.items ?? [];
}

// Fills books, authors and categories from the Google Books API.
// Safe to re-run: existing authors, categories and book titles are reused/skipped.
export class DatabaseSeeder extends Seeder {
  override async run(em: EntityManager): Promise<void> {
    const authors = new Map<string, AuthorEntity>();
    const categories = new Map<string, CategoryEntity>();
    const titles = new Set<string>();

    for (const author of await em.find(AuthorEntity, {})) {
      authors.set(author.name, author);
    }
    for (const category of await em.find(CategoryEntity, {})) {
      categories.set(category.category, category);
    }
    const existingBooks = new Map<string, BookEntity>();
    for (const book of await em.find(BookEntity, {})) {
      titles.add(book.title.toLowerCase());
      existingBooks.set(book.title.toLowerCase(), book);
    }

    const getAuthor = (name: string): AuthorEntity => {
      let author = authors.get(name);
      if (!author) {
        author = em.create(AuthorEntity, { name });
        authors.set(name, author);
      }
      return author;
    };
    const getCategory = (name: string): CategoryEntity => {
      let category = categories.get(name);
      if (!category) {
        category = em.create(CategoryEntity, { category: name });
        categories.set(name, category);
      }
      return category;
    };

    let created = 0;
    let repaired = 0;
    let skipped = 0;
    let withoutImage = 0;
    for (const term of SEARCH_TERMS) {
      for (let page = 0; page < PAGES_PER_TERM; page++) {
        let volumes: GoogleVolume[];
        try {
          volumes = await fetchVolumes(term, page);
        } catch (error) {
          console.warn(`Skipping "${term}" page ${page}:`, error);
          break;
        }
        if (volumes.length === 0) {
          break;
        }

        for (const volume of volumes) {
          const info = volume.volumeInfo;
          const title = info?.title?.trim();
          const description = info?.description?.trim();
          if (!info || !title || !description) {
            console.log(
              `  [skip] "${title ?? '(no title)'}": missing ${
                !title ? 'title' : 'description'
              }`,
            );
            skipped++;
            continue;
          }

          // Repair covers of books saved by earlier runs (blank/broken links)
          const existing = existingBooks.get(title.toLowerCase());
          if (existing) {
            existingBooks.delete(title.toLowerCase());
            console.log(`  [exists] "${title}" - checking current cover`);
            console.log(`    current image: ${existing.image ?? 'none'}`);
            if (!existing.image || !(await isUsableImage(existing.image))) {
              const image = await imageFor(volume);
              if (image) {
                existing.image = image;
                repaired++;
              } else if (existing.image) {
                (existing as { image?: string | null }).image = null;
                repaired++;
              }
            }
            continue;
          }

          if (
            title.length >= MAX_TEXT_LENGTH ||
            description.length >= MAX_TEXT_LENGTH
          ) {
            console.log(`  [skip] "${title}": title/description too long`);
            skipped++;
            continue;
          }
          if (titles.has(title.toLowerCase())) {
            console.log(`  [skip] "${title}": duplicate title`);
            skipped++;
            continue;
          }
          titles.add(title.toLowerCase());

          const price =
            volume.saleInfo?.listPrice?.amount ?? Math.random() * 100;
          const pageCount = info.pageCount ?? 0;
          const hasListPrice = volume.saleInfo?.listPrice?.amount != null;
          console.log(
            `  [new] "${title}" | authors: ${
              info.authors?.join(', ') ?? 'none'
            } | categories: ${info.categories?.join(', ') ?? 'none'} | price: ${price.toFixed(2)} (${
              hasListPrice ? 'Google list price' : 'random'
            }) | pages: ${pageCount}`,
          );
          const image = await imageFor(volume);
          if (!image) {
            withoutImage++;
          }

          em.create(BookEntity, {
            title,
            description,
            price: price.toFixed(2),
            image,
            publisher: info.publisher ?? 'NO PUBLISHER',
            publishedDate: info.publishedDate ?? 'NO DATE',
            pageCount,
            rating: '0',
            language: info.language ?? 'NO INFO',
            avgReadingTime: readingTime(pageCount),
            authors: [...new Set(info.authors ?? [])].map(getAuthor),
            categories: [
              ...new Set((info.categories ?? []).map(capitalize)),
            ].map(getCategory),
          });
          created++;
        }
        await em.flush();
        console.log(
          `Saved. Totals so far: ${created} new, ${repaired} covers repaired, ${skipped} skipped, ${withoutImage} without image, ${authors.size} authors, ${categories.size} categories`,
        );
      }
    }

    console.log(
      `Done: ${created} books created (${withoutImage} without image), ${repaired} covers repaired, ${skipped} skipped.`,
    );
  }
}
