/**
 * Returns a query string of the form:
 *   site:youtube.com inurl:watch -inurl:shorts [keywords] [after:YYYY-01-01] before:YYYY-01-01
 */
function buildQuery({ keywords, afterYear }, sliderYear) {
  const parts = [
    'site:youtube.com',
    'inurl:watch',
    '-inurl:shorts',
    ...keywords.map(kw => (kw.startsWith('"') && kw.endsWith('"') ? kw : `"${kw}"`))
  ];

  if (afterYear != null) {
    parts.push(`after:${afterYear}-01-01`);
  }

  parts.push(`before:${sliderYear}-01-01`);
  return parts.join(' ');
}

module.exports = { buildQuery };
