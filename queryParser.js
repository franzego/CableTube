// queryParser.js
// Parses a natural-language search string into structured search fields.
// Exports a single function: parse(input)

const STOP_WORDS = new Set([
  'on', 'about', 'the', 'a', 'an', 'and', 'or', 'in', 'for', 'of',
  'talks', 'talk', 'videos', 'from',
  'watch', 'full', 'original', 'real', 'official', 'best', 'great',
  'amazing', 'rare', 'lost', 'forgotten', 'found', 'unseen', 'unreleased',
  'content', 'stuff', 'things', 'thing', 'type', 'kind'
]);

const REGION_WORDS = new Set([
  'africa', 'europe', 'asia', 'america', 'australia',
  'african', 'european', 'asian', 'american', 'australian'
]);

const SYNONYMS = [
  { re: /\bmichael\s+jackson\b/gi, replacement: '"michael jackson"' },
  { re: /\bback\s+in\s+the\s+day\b/gi, replacement: 'old' },
  { re: /\bold\s+school\b/gi,           replacement: 'old' },
  { re: /\bway\s+back\b/gi,             replacement: 'old' },
  { re: /\bthrowback\b/gi,  replacement: 'old' },
  { re: /\bancient\b/gi,    replacement: 'very old' },
  { re: /\bmj\b/gi,         replacement: '"michael jackson"' },
  { re: /\bfooty\b/gi,      replacement: 'football' },
  { re: /\bsoccer\b/gi,     replacement: 'football' },
  { re: /\btoons\b/gi,      replacement: 'cartoons' },
  { re: /\bflicks\b/gi,     replacement: 'movies' },
  { re: /\bflick\b/gi,      replacement: 'movie' },
  { re: /\bdocumentaries\b/gi, replacement: 'documentary' },
  { re: /\bdocs\b/gi,          replacement: 'documentary' },
  { re: /\bdoc\b/gi,           replacement: 'documentary' },
  { re: /\bbball\b/gi,      replacement: 'basketball' },
  { re: /\bhoops\b/gi,      replacement: 'basketball' },
  { re: /\bworldcup\b/gi,   replacement: 'world cup' },
  { re: /\bwc\b/gi,         replacement: 'world cup' }
];

const TIME_HINT_PATTERNS = [
  {
    re: /\bvery\s+old\b/i,
    isExplicitBefore: false, isExplicitAfter: false,
    apply: r => { r.beforeYear = 2008; }
  },
  {
    re: /\b(\d{4})\s+to\s+(\d{4})\b/i,
    isExplicitBefore: true, isExplicitAfter: true,
    apply: (r, m) => { r.afterYear = parseInt(m[1], 10); r.beforeYear = parseInt(m[2], 10); }
  },
  {
    re: /\bfrom\s+(\d{4})\b/i,
    isExplicitBefore: false, isExplicitAfter: true,
    apply: (r, m) => { r.afterYear = parseInt(m[1], 10); }
  },
  {
    re: /\bbefore\s+(\d{4})\b/i,
    isExplicitBefore: true, isExplicitAfter: false,
    apply: (r, m) => { r.beforeYear = parseInt(m[1], 10); }
  },
  {
    re: /\bafter\s+(\d{4})\b/i,
    isExplicitBefore: false, isExplicitAfter: true,
    apply: (r, m) => { r.afterYear = parseInt(m[1], 10); }
  },
  {
    re: /\bretro\b/i,
    isExplicitBefore: false, isExplicitAfter: false,
    apply: r => { r.beforeYear = 2012; }
  },
  {
    re: /\bold\b/i,
    isExplicitBefore: false, isExplicitAfter: false,
    apply: r => { r.beforeYear = 2012; }
  },
  {
    re: /\bearly\b/i,
    isExplicitBefore: false, isExplicitAfter: false,
    apply: r => { r.beforeYear = 2012; }
  },
  {
    re: /\bvintage\b/i,
    isExplicitBefore: false, isExplicitAfter: false,
    apply: r => { r.beforeYear = 2012; }
  },
  {
    re: /\bclassic\b/i,
    isExplicitBefore: false, isExplicitAfter: false,
    apply: r => { r.beforeYear = 2012; }
  }
];

const DECADE_TABLE = {
  '60s':   { afterYearFloor: 2005, beforeYearCeiling: 1970, keepInKeywords: true  },
  '1960s': { afterYearFloor: 2005, beforeYearCeiling: 1970, keepInKeywords: true  },
  '70s':   { afterYearFloor: 2005, beforeYearCeiling: 1980, keepInKeywords: true  },
  '1970s': { afterYearFloor: 2005, beforeYearCeiling: 1980, keepInKeywords: true  },
  '80s':   { afterYearFloor: 2005, beforeYearCeiling: 1990, keepInKeywords: true  },
  '1980s': { afterYearFloor: 2005, beforeYearCeiling: 1990, keepInKeywords: true  },
  '90s':   { afterYearFloor: 2005, beforeYearCeiling: 2000, keepInKeywords: true  },
  '1990s': { afterYearFloor: 2005, beforeYearCeiling: 2000, keepInKeywords: true  },
  '2000s': { afterYearFloor: 2005, beforeYearCeiling: 2010, keepInKeywords: false },
  '2010s': { afterYearFloor: 2010, beforeYearCeiling: 2019, keepInKeywords: false }
};

const DECADE_RE = /\b((?:1[6-9]|20)\d0s|[6-9]0s)\b/gi;

function parse(input) {
  const result = { keywords: [], beforeYear: 2019, afterYear: null };
  let working = input;

  SYNONYMS.forEach(({ re, replacement }) => {
    working = working.replace(re, replacement);
  });

  const quotedPhrases = [];
  const placeholderPrefix = '\x00Q';
  working = working.replace(/"([^"]*)"/g, match => {
    quotedPhrases.push(match);
    return `${placeholderPrefix}${quotedPhrases.length - 1}\x00`;
  });

  let decadeEntry = null;
  const decadeTokensToRemove = [];

  DECADE_RE.lastIndex = 0;
  let dm;
  while ((dm = DECADE_RE.exec(working)) !== null) {
    const rawToken = dm[1];
    const entry = DECADE_TABLE[rawToken.toLowerCase()];
    if (!entry) continue;

    if (!decadeEntry) decadeEntry = entry;
    if (!entry.keepInKeywords) decadeTokensToRemove.push(rawToken);
  }

  decadeTokensToRemove.forEach(token => {
    const esc = token.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    working = working.replace(new RegExp(`\\b${esc}\\b`, 'gi'), ' ');
  });

  let explicitBeforeYearSet = false;
  let explicitAfterYearSet = false;

  TIME_HINT_PATTERNS.forEach(pattern => {
    const m = working.match(pattern.re);
    if (m) {
      pattern.apply(result, m);
      working = working.replace(pattern.re, ' ');
      if (pattern.isExplicitBefore) explicitBeforeYearSet = true;
      if (pattern.isExplicitAfter) explicitAfterYearSet = true;
    }
  });

  if (decadeEntry) {
    if (!explicitAfterYearSet) result.afterYear = decadeEntry.afterYearFloor;
    if (!explicitBeforeYearSet) result.beforeYear = decadeEntry.beforeYearCeiling;
  }

  result.keywords = working.split(/\s+/).filter(Boolean).map(tok => {
    if (tok.startsWith(placeholderPrefix) && tok.endsWith('\x00')) {
      return quotedPhrases[parseInt(tok.slice(placeholderPrefix.length, -1), 10)];
    }
    return tok;
  }).filter(tok => {
    if (tok.startsWith('"')) return true; // Keep quoted
    const lower = tok.toLowerCase();
    return REGION_WORDS.has(lower) || !STOP_WORDS.has(lower);
  });

  return result;
}

if (typeof module !== 'undefined') {
  module.exports = { parse };
}
