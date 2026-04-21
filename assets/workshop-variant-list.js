(function () {
  function asciiDigitsFromText(text) {
    return text.replace(/[\uFF10-\uFF19]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30);
    });
  }

  function findJapaneseDateInText(text) {
    if (!text || typeof text !== 'string') return null;
    const normalized = asciiDigitsFromText(text);

    let m = normalized.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (m) {
      const index = normalized.indexOf(m[0]);
      if (index < 0) return null;
      return { match: m, index: index, kind: 'ymd' };
    }

    m = normalized.match(/(\d{1,2})月(\d{1,2})日/);
    if (m) {
      const index = normalized.indexOf(m[0]);
      if (index < 0) return null;
      return { match: m, index: index, kind: 'md' };
    }

    return null;
  }

  function parseJapaneseEventDate(text) {
    if (!text || typeof text !== 'string') return null;
    const found = findJapaneseDateInText(text);
    if (!found) return null;
    const m = found.match;

    if (found.kind === 'ymd') {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10);
      const d = parseInt(m[3], 10);
      if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      const date = new Date(y, mo - 1, d);
      if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
      return date;
    }

    const mo = parseInt(m[1], 10);
    const d = parseInt(m[2], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const now = new Date();
    let y = now.getFullYear();
    let candidate = new Date(y, mo - 1, d);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (candidate < startToday) {
      y++;
      candidate = new Date(y, mo - 1, d);
    }
    if (candidate.getFullYear() !== y || candidate.getMonth() !== mo - 1 || candidate.getDate() !== d) return null;
    return candidate;
  }

  function formatJapaneseDate(date) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return y + '年' + mo + '月' + day + '日';
  }

  function getNoticeDaysBefore(card) {
    const section = card.closest('.workshop-variant-list');
    if (!section) return 7;
    const raw = section.getAttribute('data-deadline-notice-days');
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 7;
  }

  function removeAutoDeadlines(card) {
    card.querySelectorAll('.workshop-variant-list__deadline--auto').forEach(function (el) {
      el.remove();
    });
  }

  function splitCombinedVenueDatetime(meta) {
    const venueEl = meta.querySelector('.workshop-variant-list__venue');
    if (!venueEl) return;

    const existingDt = meta.querySelector('.workshop-variant-list__datetime');
    if (existingDt && (existingDt.textContent || '').trim().length > 0) return;

    const text = venueEl.textContent.trim();
    const found = findJapaneseDateInText(text);
    if (!found || found.index <= 0) return;

    const venueText = text.slice(0, found.index).trim();
    const dateText = text.slice(found.index).trim();
    if (!venueText || !dateText) return;

    venueEl.textContent = venueText;
    const row = document.createElement('div');
    row.className = 'workshop-variant-list__meta-row';
    const p = document.createElement('p');
    p.className = 'workshop-variant-list__datetime';
    p.textContent = dateText;
    row.appendChild(p);
    const venueRow = venueEl.closest('.workshop-variant-list__meta-row');
    if (venueRow) {
      venueRow.insertAdjacentElement('afterend', row);
    } else {
      venueEl.insertAdjacentElement('afterend', row);
    }
  }

  function initCard(card) {
    removeAutoDeadlines(card);

    const available = card.getAttribute('data-available') === 'true';
    const manual = card.getAttribute('data-manual-deadline') === 'true';
    if (!available || manual) return;

    const dtEl = card.querySelector('.workshop-variant-list__datetime');
    if (!dtEl) return;

    let text = (dtEl.textContent || '').trim();
    const eventDate = parseJapaneseEventDate(text);
    if (!eventDate) return;

    const deadline = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() - 3, 12, 0, 0, 0);

    const now = new Date();
    if (now.getTime() >= deadline.getTime()) return;

    const daysBefore = getNoticeDaysBefore(card);
    if (daysBefore > 0) {
      const windowStart = new Date(deadline);
      windowStart.setDate(windowStart.getDate() - daysBefore);
      windowStart.setHours(0, 0, 0, 0);
      if (now.getTime() < windowStart.getTime()) return;
    }

    const p = document.createElement('p');
    p.className = 'workshop-variant-list__deadline workshop-variant-list__deadline--auto';
    p.textContent = '募集締切間近\uFF1A' + formatJapaneseDate(deadline) + ' 正午';

    const actions = card.querySelector('.workshop-variant-list__actions');
    if (actions) {
      actions.before(p);
    } else {
      card.appendChild(p);
    }
  }

  function initWorkshopVariantList(container) {
    const root = container && container.querySelector ? container : document;
    root.querySelectorAll('[data-workshop-variant-card]').forEach(function (card) {
      const meta = card.querySelector('.workshop-variant-list__meta');
      if (meta) splitCombinedVenueDatetime(meta);
      initCard(card);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initWorkshopVariantList(document);
  });

  document.addEventListener('shopify:section:load', function (event) {
    if (event.target && event.target.querySelectorAll) {
      initWorkshopVariantList(event.target);
    }
  });
})();
