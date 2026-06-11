// test/test.js
// Hand-rolled tests for queryParser.js
// Run with: node test/test.js

var parser = require('../queryParser.js');
var parse  = parser.parse;

var passed = 0;
var failed = 0;

// ─── assertion helpers ───────────────────────────────────────────────────────

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function assert(label, actual, expected) {
  var ok;
  if (Array.isArray(expected)) {
    ok = Array.isArray(actual) && arraysEqual(actual, expected);
  } else {
    ok = actual === expected;
  }

  if (ok) {
    console.log('PASS ' + label);
    passed++;
  } else {
    console.log(
      'FAIL ' + label +
      '\n     expected: ' + JSON.stringify(expected) +
      '\n     actual:   ' + JSON.stringify(actual)
    );
    failed++;
  }
}

function run(testName, input, expected) {
  var result = parse(input);
  assert(testName + ' → keywords',   result.keywords,   expected.keywords);
  assert(testName + ' → beforeYear', result.beforeYear, expected.beforeYear);
  assert(testName + ' → afterYear',  result.afterYear,  expected.afterYear);
}

// ─── tests ───────────────────────────────────────────────────────────────────

run(
  'test 1: old programming talks on c++',
  'old programming talks on c++',
  { keywords: ['programming', 'c++'], beforeYear: 2012, afterYear: null }
);

run(
  'test 2: very old unix lectures',
  'very old unix lectures',
  { keywords: ['unix'], beforeYear: 2008, afterYear: null }
);

run(
  'test 3: c++ talks from 2006 to 2009',
  'c++ talks from 2006 to 2009',
  { keywords: ['c++'], beforeYear: 2009, afterYear: 2006 }
);

run(
  'test 4: design patterns javascript',
  'design patterns javascript',
  { keywords: ['design', 'patterns', 'javascript'], beforeYear: 2019, afterYear: null }
);

run(
  'test 5: "design patterns" javascript',
  '"design patterns" javascript',
  { keywords: ['"design patterns"', 'javascript'], beforeYear: 2019, afterYear: null }
);

run(
  'test 6: early lisp videos',
  'early lisp videos',
  { keywords: ['lisp'], beforeYear: 2012, afterYear: null }
);

run(
  'test 7: before 2010 haskell talks',
  'before 2010 haskell talks',
  { keywords: ['haskell'], beforeYear: 2010, afterYear: null }
);

run(
  'test 8: after 2005 sicp lectures',
  'after 2005 sicp lectures',
  { keywords: ['sicp'], beforeYear: 2019, afterYear: 2005 }
);

// ─── session 2: search.js — buildQuery ───────────────────────────────────────

var search     = require('../search.js');
var buildQuery = search.buildQuery;

function assertEq(label, actual, expected) {
  if (actual === expected) {
    console.log('PASS ' + label);
    passed++;
  } else {
    console.log(
      'FAIL ' + label +
      '\n     expected: ' + JSON.stringify(expected) +
      '\n     actual:   ' + JSON.stringify(actual)
    );
    failed++;
  }
}

assertEq(
  'buildQuery 1: bare keywords, no afterYear',
  buildQuery({ keywords: ['c++', 'programming'], afterYear: null }, 2012),
  'site:youtube.com inurl:watch -inurl:shorts "c++" "programming" before:2012-01-01'
);

assertEq(
  'buildQuery 2: already-quoted phrase, no afterYear',
  buildQuery({ keywords: ['"design patterns"', 'javascript'], afterYear: null }, 2019),
  'site:youtube.com inurl:watch -inurl:shorts "design patterns" "javascript" before:2019-01-01'
);

assertEq(
  'buildQuery 3: single keyword with afterYear',
  buildQuery({ keywords: ['lisp'], afterYear: 2006 }, 2012),
  'site:youtube.com inurl:watch -inurl:shorts "lisp" after:2006-01-01 before:2012-01-01'
);

assertEq(
  'buildQuery 4: single keyword, no afterYear',
  buildQuery({ keywords: ['rust'], afterYear: null }, 2019),
  'site:youtube.com inurl:watch -inurl:shorts "rust" before:2019-01-01'
);

assertEq(
  'buildQuery 5: mixed quoted/bare keywords with afterYear',
  buildQuery({ keywords: ['"operating systems"', 'unix'], afterYear: 2004 }, 2008),
  'site:youtube.com inurl:watch -inurl:shorts "operating systems" "unix" after:2004-01-01 before:2008-01-01'
);

assertEq(
  'buildQuery 6: empty keywords, no afterYear',
  buildQuery({ keywords: [], afterYear: null }, 2012),
  'site:youtube.com inurl:watch -inurl:shorts before:2012-01-01'
);

// ─── SESSION 5 TESTS ─────────────────────────────────────────────────────────

// 1. Synonym: "mj" → "michael jackson"
run(
  'session5 test 1: mj thriller',
  'mj thriller',
  { keywords: ['"michael jackson"', 'thriller'], beforeYear: 2019, afterYear: null }
);

// 2. Synonym: "old school" → "old"; "basketball" survives (content descriptor)
run(
  'session5 test 2: old school basketball highlights',
  'old school basketball highlights',
  { keywords: ['basketball', 'highlights'], beforeYear: 2012, afterYear: null }
);

// 3. Decade 80s: keeps "80s" in keywords; afterYear floor 2005; beforeYear 1990
run(
  'session5 test 3: 80s cartoons',
  '80s cartoons',
  { keywords: ['80s', 'cartoons'], afterYear: 2005, beforeYear: 1990 }
);

// 4. Decade 90s: keeps "90s"; stop words stripped
run(
  'session5 test 4: 90s hip hop concerts',
  '90s hip hop concerts',
  { keywords: ['90s', 'hip', 'hop', 'concerts'], afterYear: 2005, beforeYear: 2000 }
);

// 5. Decade 2000s: removed from keywords; "documentaries" → "documentary"
run(
  'session5 test 5: 2000s documentaries',
  '2000s documentaries',
  { keywords: ['documentary'], afterYear: 2005, beforeYear: 2010 }
);

// 6. "retro" time hint → beforeYear 2012; "video" and "games" survive
run(
  'session5 test 6: retro video games',
  'retro video games',
  { keywords: ['video', 'games'], beforeYear: 2012, afterYear: null }
);

// 7. Decade 80s beforeYear (1990) beats vague "old" beforeYear (2012)
run(
  'session5 test 7: old 80s michael jackson concert',
  'old 80s michael jackson concert',
  { keywords: ['80s', '"michael jackson"', 'concert'], afterYear: 2005, beforeYear: 1990 }
);

// 8. Region word "african" survives; "worldcup" → "world cup" (two tokens)
run(
  'session5 test 8: african football worldcup',
  'african football worldcup',
  { keywords: ['african', 'football', 'world', 'cup'], beforeYear: 2019, afterYear: null }
);

// 9. Explicit afterYear (1987) beats decade floor; decade beforeYear (1990) still applies
run(
  'session5 test 9: 80s concert from 1987',
  '80s concert from 1987',
  { keywords: ['80s', 'concert'], afterYear: 1987, beforeYear: 1990 }
);

// ─── summary ─────────────────────────────────────────────────────────────────

console.log('\n' + passed + ' passed, ' + failed + ' failed.');
if (failed > 0) process.exit(1);

