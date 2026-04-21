(function () {
  function getVariantIdFromUrl() {
    const raw = new URLSearchParams(window.location.search).get('variant');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }

  function parseData(root) {
    const el = root.querySelector('[type="application/json"][data-wdh-json]');
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return null;
    }
  }

  function pickImageUrl(entry, fallback) {
    if (entry.photoUrl && String(entry.photoUrl).trim()) return String(entry.photoUrl).trim();
    if (entry.photoFileUrl && String(entry.photoFileUrl).trim()) return String(entry.photoFileUrl).trim();
    return fallback ? String(fallback).trim() : '';
  }

  function updatePanel(root, data, variantId, variantTitle) {
    if (!data || !data.variants) return;
    const key = String(variantId);
    const entry = data.variants[key];
    if (!entry) return;

    const fallback = data.fallbackImage || '';
    const img = root.querySelector('.wdh__image');
    if (img) {
      let src = pickImageUrl(entry, fallback);
      if (!src && fallback) src = String(fallback).trim();
      if (src) {
        img.src = src;
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
      }
      if (variantTitle) {
        img.alt = (data.productTitle ? data.productTitle + ' — ' : '') + variantTitle;
      }
    }

    const setField = (name, val) => {
      const node = root.querySelector('[data-wdh-field="' + name + '"]');
      if (!node) return;
      const row = node.closest('tr[data-wdh-row]');
      const v = val != null ? String(val).trim() : '';
      node.textContent = v;
      if (row) row.hidden = !v;
    };

    setField('day', entry.day);
    setField('time', entry.time);
    setField('mochimono', entry.mochimono);
    setField('kaijyo', entry.kaijyo);
    setField('jyusho', entry.jyusho);
    setField('biko', entry.biko);
  }

  function initRoot(root) {
    if (root.dataset.wdhInitialized === 'true') return;
    root.dataset.wdhInitialized = 'true';

    const data = parseData(root);
    if (!data || !data.variants) return;

    let variantId = getVariantIdFromUrl();
    if (variantId == null || !data.variants[String(variantId)]) {
      const initial = parseInt(root.dataset.initialVariantId, 10);
      variantId = Number.isFinite(initial) ? initial : null;
    }
    if (variantId == null) return;

    const initialTitle = root.dataset.initialVariantTitle || '';
    updatePanel(root, data, variantId, initialTitle);

    const onVariantChange = function (event) {
      const v = event && event.data && event.data.variant;
      if (!v || v.id == null) return;
      if (!data.variants[String(v.id)]) return;
      updatePanel(root, data, v.id, v.title || '');
    };

    const unsub = typeof subscribe === 'function' ? subscribe(PUB_SUB_EVENTS.variantChange, onVariantChange) : null;

    const onPopState = function () {
      const id = getVariantIdFromUrl();
      if (id != null && data.variants[String(id)]) {
        updatePanel(root, data, id, '');
      }
    };
    window.addEventListener('popstate', onPopState);
  }

  function boot(container) {
    const scope = container && container.querySelectorAll ? container : document;
    scope.querySelectorAll('.workshop-dynamic-header').forEach(initRoot);
  }

  document.addEventListener('DOMContentLoaded', function () {
    boot(document);
  });

  document.addEventListener('shopify:section:load', function (event) {
    if (event.target && event.target.querySelectorAll) {
      boot(event.target);
    }
  });
})();
