(function () {
  function parseJapaneseEventDate(text) {
    if (!text || typeof text !== 'string') return null;
    const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
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

  function initCard(card) {
    removeAutoDeadlines(card);

    const available = card.getAttribute('data-available') === 'true';
    const manual = card.getAttribute('data-manual-deadline') === 'true';
    if (!available || manual) return;

    const dtEl = card.querySelector('.workshop-variant-list__datetime');
    if (!dtEl) return;

    let text = (dtEl.textContent || '').replace(/\s*満席\s*$/, '').trim();
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
    root.querySelectorAll('[data-workshop-variant-card]').forEach(initCard);
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
