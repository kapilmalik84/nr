/**
 * Shared query index fetcher with module-level cache.
 * Prevents duplicate network requests when multiple blocks on the same page
 * (e.g. article-list + search) both need the query index.
 */

const cache = new Map();

export async function getQueryIndex(source = '/query-index.json') {
  if (cache.has(source)) return cache.get(source);
  const promise = fetch(source)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    })
    .then((json) => json.data || [])
    .catch((err) => { console.error('query-index fetch failed:', source, err); return []; });
  cache.set(source, promise);
  return promise;
}
