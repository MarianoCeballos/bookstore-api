const MIN_BYTES = 2000;
const MIN_WIDTH = 100;
const MIN_HEIGHT = 130;
const REQUEST_TIMEOUT_MS = 10000;

interface ImageSources {
  isbns: string[];
  googleThumbnail?: string;
}

function readDimensions(
  buf: Buffer,
): { width: number; height: number } | undefined {
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      if (marker === 0xd8 || marker === 0x01 || marker === 0xff) {
        offset += marker === 0xff ? 1 : 2;
        continue;
      }
      const isStartOfFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isStartOfFrame) {
        return {
          height: buf.readUInt16BE(offset + 5),
          width: buf.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + buf.readUInt16BE(offset + 2);
    }
  }
  return undefined;
}

// A URL is usable only if it serves a real image, not a 1x1 placeholder or a tiny blank.
export async function checkImage(
  url: string,
): Promise<{ ok: boolean; reason: string }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }
    const type = response.headers.get('content-type') ?? 'none';
    if (!type.startsWith('image/')) {
      return { ok: false, reason: `not an image (content-type: ${type})` };
    }
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length < MIN_BYTES) {
      return { ok: false, reason: `too small (${buf.length} bytes)` };
    }
    const size = readDimensions(buf);
    if (!size) {
      return { ok: false, reason: 'unknown image dimensions' };
    }
    const detail = `${size.width}x${size.height}px, ${buf.length} bytes`;
    if (size.width < MIN_WIDTH || size.height < MIN_HEIGHT) {
      return { ok: false, reason: `dimensions too small (${detail})` };
    }
    return { ok: true, reason: detail };
  } catch (error) {
    return {
      ok: false,
      reason: `request error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function isUsableImage(url: string): Promise<boolean> {
  const result = await checkImage(url);
  console.log(
    `      ${result.ok ? 'OK  ' : 'FAIL'} ${url} -> ${result.reason}`,
  );
  return result.ok;
}

export async function findBookImage({
  isbns,
  googleThumbnail,
}: ImageSources): Promise<string | undefined> {
  const candidates = [
    // default=false makes Open Library answer 404 instead of a blank image
    ...isbns.map((isbn) => ({
      source: 'OpenLibrary',
      url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
    })),
    ...(googleThumbnail
      ? [
          {
            source: 'GoogleThumbnail',
            url: googleThumbnail
              .replace(/^http:/, 'https:')
              .replace('&edge=curl', ''),
          },
        ]
      : []),
    ...isbns
      .filter((isbn) => isbn.length === 10)
      .map((isbn) => ({
        source: 'Amazon',
        url: `https://images-na.ssl-images-amazon.com/images/P/${isbn}.01._SX180_SCLZZZZZZZ_.jpg`,
      })),
  ];

  if (candidates.length === 0) {
    console.log('      no ISBN and no Google thumbnail: no image candidates');
  }
  for (const { source, url } of candidates) {
    console.log(`    trying ${source}`);
    if (await isUsableImage(url)) {
      console.log(`    => using ${source}`);
      return url;
    }
  }
  console.log('    => no usable image found');
  return undefined;
}
