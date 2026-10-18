// FocusFlow AI — Context-Aware Website & Media Classifier (MV3)
//
// Transparent, explainable, and multi-domain (students, developers, entrepreneurs,
// researchers, creators, and business professionals).
//
// Categories:
//   - PRODUCTIVE ('productive')
//   - POTENTIALLY_PRODUCTIVE ('possibly_productive')
//   - DISTRACTING ('distracting')
//   - UNKNOWN ('unknown')
//
// Privacy guarantee: Uses only domain, URL structure, page/video title, and
// active task context. Never inspects form values, credentials, or private contents.

const SITE_GROUPS = {
  social: [
    'instagram.com', 'facebook.com', 'snapchat.com', 'tiktok.com',
    'threads.net', 'twitter.com', 'x.com', 'pinterest.com', 'tumblr.com',
    'reddit.com', '9gag.com',
  ],
  entertainment: [
    'netflix.com', 'twitch.tv', 'disneyplus.com', 'primevideo.com',
    'hulu.com', 'hotstar.com', 'jiocinema.com', 'sonyliv.com', 'zee5.com',
    'imdb.com', 'roblox.com', 'steampowered.com', 'epicgames.com',
    'chess.com', 'crunchyroll.com',
  ],
  developer: [
    'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
    'stackexchange.com', 'developer.mozilla.org', 'react.dev', 'vuejs.org',
    'angular.dev', 'nodejs.org', 'npmjs.com', 'developer.chrome.com',
    'developer.oracle.com', 'postgresql.org', 'mysql.com', 'sqlite.org',
    'mongodb.com', 'w3schools.com', 'geeksforgeeks.org', 'javatpoint.com',
    'tutorialspoint.com', 'kaggle.com', 'leetcode.com', 'hackerrank.com',
    'codeforces.com', 'codewars.com', 'vercel.com', 'netlify.com',
    'railway.app', 'supabase.com', 'firebase.google.com', 'render.com',
    'aws.amazon.com', 'console.cloud.google.com', 'huggingface.co',
    'docker.com', 'kubernetes.io', 'pypi.org', 'crates.io', 'python.org',
  ],
  business: [
    'notion.so', 'docs.google.com', 'drive.google.com', 'sheets.google.com',
    'slides.google.com', 'linear.app', 'atlassian.com', 'jira.atlassian.com',
    'trello.com', 'asana.com', 'slack.com', 'stripe.com', 'crunchbase.com',
    'pitch.com', 'quickbooks.intuit.com', 'hubspot.com', 'mailchimp.com',
    'figma.com', 'canva.com', 'dribbble.com', 'behance.net', 'miro.com',
    'airtable.com', 'coda.io', 'loom.com',
  ],
  research: [
    'arxiv.org', 'scholar.google.com', 'researchgate.net', 'pubmed.ncbi.nlm.nih.gov',
    'jstor.org', 'wikipedia.org', 'britannica.com', 'sciencedirect.com',
    'nature.com', 'semanticscholar.org', 'biorxiv.org', 'frontiersin.org',
  ],
  education: [
    'coursera.org', 'udemy.com', 'khanacademy.org', 'edx.org', 'kodnest.com',
    'nptel.ac.in', 'swayam.gov.in', 'byjus.com', 'unacademy.com', 'brilliant.org',
    'freecodecamp.org', 'scrimba.com', 'mit.edu', 'stanford.edu', 'ocw.mit.edu',
  ],
  search: ['google.com', 'bing.com', 'duckduckgo.com', 'search.brave.com', 'ecosia.org', 'kagi.com'],
  news: ['news.google.com', 'reuters.com', 'bbc.com', 'theverge.com', 'techcrunch.com', 'news.ycombinator.com'],
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'learn', 'complete', 'build', 'finish',
  'study', 'work', 'task', 'module', 'project', 'assignment', 'session', 'focus',
  'this', 'that', 'into', 'your', 'you', 'about', 'how', 'what', 'using', 'use',
  'make', 'write', 'read', 'watch', 'practice', 'revise', 'prepare', 'notes',
  'deep', 'some', 'have', 'will', 'when', 'while', 'then', 'than', 'more', 'all',
]);

const YOUTUBE_ENTERTAINMENT_MARKERS = [
  'gameplay', 'gaming', 'minecraft', 'gta', 'roblox', 'fortnite', 'valorant',
  'stream highlights', 'funny moments', 'meme', 'prank', 'music video',
  'official mv', 'official audio', 'lyric video', 'trailer', 'vlog',
  'stand up comedy', 'shorts', 'speedrun', 'bloopers', 'reaction',
];

const YOUTUBE_EDUCATIONAL_MARKERS = [
  'tutorial', 'course', 'lecture', 'documentation', 'docs', 'learn', 'coding',
  'programming', 'study', 'crash course', 'full course', 'walkthrough',
  'how to', 'guide', 'explained', 'deep dive', 'analysis', 'masterclass',
];

function cleanHost(hostname) {
  if (!hostname) return '';
  let str = String(hostname).trim().toLowerCase();
  str = str.replace(/^[a-z]+:\/\//, '');
  str = str.replace(/[/?#].*$/, '');
  str = str.replace(/:\d+$/, '');
  str = str.replace(/^www\./, '');
  return str.trim();
}

function matchesDomain(hostname, domains) {
  const host = cleanHost(hostname);
  return (domains || []).some((domain) => {
    const normalized = cleanHost(domain);
    if (!normalized) return false;
    return host === normalized || host.endsWith(`.${normalized}`);
  });
}

function taskKeywords(taskTitle, subject) {
  return `${taskTitle || ''} ${subject || ''}`
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .map((word) => word.trim().replace(/^[.+-]+|[.+-]+$/g, ''))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

function relevantText(text, keywords) {
  const normalized = String(text || '').toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function extractYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
    if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2];
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1);
    return null;
  } catch {
    return null;
  }
}

function searchQuery(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get('q') ||
      parsed.searchParams.get('query') ||
      parsed.searchParams.get('search_query') ||
      ''
    );
  } catch {
    return '';
  }
}

/**
 * Classify a site or media item during an active focus session.
 */
function classifySite(optionsOrUrl = {}, legacyOptions = {}) {
  const opts =
    typeof optionsOrUrl === 'string'
      ? { url: optionsOrUrl, ...legacyOptions }
      : optionsOrUrl && typeof optionsOrUrl === 'object'
        ? optionsOrUrl
        : {};

  const {
    hostname,
    url = '',
    title = '',
    taskTitle = '',
    subject = '',
    strictness = 'balanced',
    mode = 'smart',
    primarySite = '',
    allowedSites = [],
    blockedSites = [],
    warningSites = [],
    temporaryExceptions = [],
    videoExceptions = [],
  } = opts;

  let host = cleanHost(hostname);
  if (!host && url) {
    host = cleanHost(url);
  }
  const keywords = taskKeywords(taskTitle, subject);
  const query = searchQuery(url);
  const searchableText = `${host} ${url || ''} ${title || ''} ${query}`.toLowerCase();
  const taskRelevant = keywords.length > 0 && relevantText(searchableText, keywords);

  // 0. FocusFlow local web application and internal extension resources are always permitted
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('focusflow') ||
    url.startsWith('chrome-extension://')
  ) {
    return {
      category: 'productive',
      confidence: 1,
      action: 'allow',
      reason: 'FocusFlow system application and active session controls.',
    };
  }

  // 1. Single-Site Focus Lock
  const isSingleSiteLock =
    mode === 'single_site' ||
    strictness === 'single_site' ||
    (Boolean(primarySite) && mode === 'strict_lock');

  if (isSingleSiteLock) {
    const cleanPrimary = cleanHost(primarySite);
    const isApproved =
      (cleanPrimary && (host === cleanPrimary || host.endsWith(`.${cleanPrimary}`))) ||
      matchesDomain(host, allowedSites);

    if (isApproved) {
      return {
        category: 'productive',
        confidence: 1,
        action: 'allow',
        reason: 'Approved site for Single-Site Focus Lock session.',
      };
    }

    return {
      category: 'distracting',
      confidence: 1,
      action: 'block',
      reason: `Single-Site Focus Lock active: Navigation is restricted to ${cleanPrimary || 'the approved site'}.`,
    };
  }

  // 2. Video-specific exceptions for YouTube
  const videoId = extractYouTubeVideoId(url);
  if (videoId && (videoExceptions || []).includes(videoId)) {
    return {
      category: 'productive',
      confidence: 1,
      action: 'allow',
      reason: 'This YouTube video was approved for the active session.',
      videoId,
    };
  }

  // 3. Domain-level temporary exceptions
  const activeException = (temporaryExceptions || []).find(
    (exception) => exception && exception.domain === host && exception.expiresAt > Date.now()
  );
  if (activeException) {
    return {
      category: 'productive',
      confidence: 1,
      action: 'allow',
      reason: 'Temporary exception granted for this session.',
      exception: true,
    };
  }

  // 4. Explicit user session rules
  if (matchesDomain(host, blockedSites)) {
    return {
      category: 'distracting',
      confidence: 1,
      action: 'block',
      reason: 'Blocked by your explicit session rule.',
    };
  }
  if (matchesDomain(host, allowedSites)) {
    return {
      category: 'productive',
      confidence: 1,
      action: 'allow',
      reason: 'Allowed by your explicit session rule.',
    };
  }
  if (matchesDomain(host, warningSites)) {
    return {
      category: 'possibly_productive',
      confidence: 0.65,
      action: 'warn',
      reason: 'You asked FocusFlow to check this site before use.',
    };
  }

  // 5. Context-aware YouTube handling (never blanket-blocked)
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
    const titleLower = (title || '').toLowerCase();
    const queryLower = query.toLowerCase();
    const mediaText = `${titleLower} ${queryLower}`;

    const isEduMarker = YOUTUBE_EDUCATIONAL_MARKERS.some((m) => mediaText.includes(m));
    const isEntMarker = YOUTUBE_ENTERTAINMENT_MARKERS.some((m) => mediaText.includes(m));

    // High-confidence relevant
    if (taskRelevant || (isEduMarker && keywords.length > 0 && relevantText(mediaText, keywords))) {
      return {
        category: 'productive',
        confidence: 0.88,
        action: 'allow',
        reason: taskTitle
          ? `YouTube video directly supports your task: “${taskTitle}”.`
          : 'Educational video content matching active work.',
        videoId,
      };
    }

    // High-confidence distraction
    if (isEntMarker && !taskRelevant) {
      return {
        category: 'distracting',
        confidence: 0.92,
        action: strictness === 'strict' ? 'block' : 'warn',
        reason: 'Entertainment video unrelated to your focus task.',
        videoId,
      };
    }

    // Ambiguous / General Educational
    if (isEduMarker) {
      return {
        category: 'possibly_productive',
        confidence: 0.72,
        action: 'warn',
        reason: 'Educational video: verify whether this supports your current task.',
        videoId,
      };
    }

    // Generic YouTube browsing (homepage / recommendations)
    return {
      category: 'possibly_productive',
      confidence: 0.55,
      action: strictness === 'strict' ? 'warn' : 'allow',
      reason: 'YouTube browsing: confirm this video relates to your session goal.',
      videoId,
    };
  }

  // 6. Hard categories: social & entertainment
  if (matchesDomain(host, SITE_GROUPS.social)) {
    return {
      category: 'distracting',
      confidence: 0.98,
      action: 'block',
      reason: 'Social media is unrelated to most focus tasks.',
    };
  }
  if (matchesDomain(host, SITE_GROUPS.entertainment)) {
    return {
      category: 'distracting',
      confidence: 0.96,
      action: 'block',
      reason: 'Entertainment content is a distraction during focus sessions.',
    };
  }

  // 7. Known professional & educational groups
  if (
    matchesDomain(host, SITE_GROUPS.developer) ||
    matchesDomain(host, SITE_GROUPS.business) ||
    matchesDomain(host, SITE_GROUPS.research) ||
    matchesDomain(host, SITE_GROUPS.education)
  ) {
    return {
      category: 'productive',
      confidence: taskRelevant ? 0.95 : 0.82,
      action: 'allow',
      reason: taskRelevant
        ? 'Domain matches active task context and productive tools.'
        : 'Recognized professional, developer, or educational resource.',
    };
  }

  // 8. Search engines
  if (matchesDomain(host, SITE_GROUPS.search)) {
    return {
      category: taskRelevant ? 'productive' : 'possibly_productive',
      confidence: taskRelevant ? 0.85 : 0.6,
      action: 'allow',
      reason: taskRelevant
        ? 'Search query matches your focus task topic.'
        : 'Search engines remain available for reference; verify task relevance.',
    };
  }

  // 9. News & commentary
  if (matchesDomain(host, SITE_GROUPS.news)) {
    return {
      category: taskRelevant ? 'possibly_productive' : 'distracting',
      confidence: taskRelevant ? 0.7 : 0.85,
      action: taskRelevant ? 'warn' : (strictness === 'strict' ? 'block' : 'warn'),
      reason: taskRelevant
        ? 'News article appears relevant to research task.'
        : 'News websites can cause focus drift during deep sessions.',
    };
  }

  // 10. Task keyword match on generic domains
  if (taskRelevant) {
    return {
      category: 'productive',
      confidence: 0.78,
      action: 'allow',
      reason: 'Page title or URL mentions your focus task topic.',
    };
  }

  // 11. Unknown domain fallback
  return {
    category: 'unknown',
    confidence: 0.5,
    action: strictness === 'strict' ? 'warn' : 'allow',
    reason: strictness === 'strict'
      ? 'Unknown website: confirm whether this site supports your task.'
      : 'Unknown website: FocusFlow is monitoring activity.',
  };
}

// Export for service worker and tests
if (typeof self !== 'undefined') {
  self.FocusFlowClassifier = {
    classifySite,
    taskKeywords,
    matchesDomain,
    cleanHost,
    extractYouTubeVideoId,
    SITE_GROUPS,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifySite,
    taskKeywords,
    matchesDomain,
    cleanHost,
    extractYouTubeVideoId,
    SITE_GROUPS,
  };
}
