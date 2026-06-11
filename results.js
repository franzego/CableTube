// results.js
// Renders Serper video search results into #results.
// Exposes three functions on window: renderResults, renderError, renderLoading.

const getResultsEl = () => document.getElementById('results');
const clearResults = () => { getResultsEl().innerHTML = ''; };

const escapeHTML = str => !str ? '' : str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const centeredMessage = (text, color = '#aaa', italic = false) => {
  const p = document.createElement('p');
  p.textContent = text;
  Object.assign(p.style, {
    textAlign: 'center',
    color,
    fontStyle: italic ? 'italic' : 'normal',
    fontSize: '13px',
    lineHeight: '1.5'
  });
  return p;
};

window.renderLoading = () => {
  getResultsEl().innerHTML = `
    <div style="padding: 40px 0; text-align: center;">
      <div style="font-size: 13px; color: #666; font-style: italic; margin-bottom: 12px;">Searching...</div>
      <div style="width: 300px; height: 8px; background: #ddd; border: 1px solid #bbb; margin: 0 auto; overflow: hidden;">
        <div id="yt-progress-bar" style="width: 40%; height: 100%; background: #cc0000; animation: vtube-slide 1.2s ease-in-out infinite;"></div>
      </div>
    </div>
    <style>
      @keyframes vtube-slide { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }
    </style>
  `;
};

window.renderError = message => {
  clearResults();
  getResultsEl().appendChild(centeredMessage(message, '#cc0000', false));
};

window.renderResults = items => {
  clearResults();

  if (!items || items.length === 0) {
    getResultsEl().appendChild(centeredMessage('No results found. Try different keywords or adjust the year slider.', '#aaa', true));
    return;
  }

  const list = document.createElement('ul');
  list.className = 'result-list';
  list.innerHTML = items.map(buildCardHTML).join('');
  getResultsEl().appendChild(list);

  const tip = centeredMessage('Want more videos? Copy the query and search directly on YouTube!', '#777', true);
  Object.assign(tip.style, { marginTop: '20px', paddingBottom: '10px' });
  getResultsEl().appendChild(tip);
};

const buildCardHTML = item => {
  const link = escapeHTML(item.link || '#');
  const title = escapeHTML(item.title || '(no title)');
  const imgHtml = item.imageUrl
    ? `<img src="${escapeHTML(item.imageUrl)}" alt="${title}" width="130" height="98" class="thumb-img" onerror="this.style.display='none'; this.parentNode.classList.add('thumb-placeholder');">`
    : '';
  const durationHtml = item.duration ? `<span class="thumb-duration">${escapeHTML(item.duration)}</span>` : '';
  
  const bylineParts = [item.channel, item.date].filter(Boolean).map(escapeHTML).join(' &middot; ');
  const bylineHtml = bylineParts ? `<p class="result-byline">${bylineParts}</p>` : '';
  const snippetHtml = item.snippet ? `<p class="result-snippet">${escapeHTML(item.snippet)}</p>` : '';

  return `
    <li class="result-card">
      <a href="${link}" target="_blank" rel="noopener noreferrer" class="thumb-link ${!item.imageUrl ? 'thumb-placeholder' : ''}">
        ${imgHtml}
        ${durationHtml}
      </a>
      <div class="result-meta">
        <a href="${link}" target="_blank" rel="noopener noreferrer" class="result-title">${title}</a>
        ${bylineHtml}
        ${snippetHtml}
      </div>
    </li>
  `;
};
