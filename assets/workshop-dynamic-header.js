(function () {
  var ROW_DEFS = [
    ['day', '日程', false],
    ['time', '時間', false],
    ['kaijyo', '会場', false],
    ['jyusho', '住所', false],
    ['mochimono', '持ち物', false],
    ['biko', '備考', true],
  ];

  function getVariantIdFromUrl() {
    var raw = new URLSearchParams(window.location.search).get('variant');
    if (!raw) return null;
    var n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }

  function parseData(root) {
    var el = root.querySelector('[type="application/json"][data-wdh-json]');
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return null;
    }
  }

  function normalizePhotoUrl(u) {
    if (!u || typeof u !== 'string') return '';
    var s = u.trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.indexOf('//') === 0) return 'https:' + s;
    if (s.indexOf('/') === 0 && typeof window !== 'undefined' && window.location && window.location.origin) {
      return window.location.origin + s;
    }
    return s;
  }

  function pickImageUrl(entry, fallback) {
    var tryNorm = function (x) {
      if (!x || !String(x).trim()) return '';
      return normalizePhotoUrl(String(x).trim());
    };
    var src = tryNorm(entry.imageUrl);
    if (src) return src;
    src = tryNorm(entry.photoUrl);
    if (src) return src;
    src = tryNorm(entry.photoFileUrl);
    if (src) return src;
    return tryNorm(fallback) || '';
  }

  function findInsertBefore(tbody, root, defIndex) {
    for (var j = defIndex + 1; j < ROW_DEFS.length; j++) {
      var key = ROW_DEFS[j][0];
      var tr = root.querySelector('tr[data-wdh-row="' + key + '"]');
      if (tr) return tr;
    }
    return null;
  }

  function syncTableRows(root, entry) {
    var tbody = root.querySelector('.wdh-table tbody');
    if (!tbody) return;

    ROW_DEFS.forEach(function (def, index) {
      var key = def[0];
      var label = def[1];
      var muted = def[2];
      var val = entry[key] != null ? String(entry[key]).trim() : '';

      var tr = root.querySelector('tr[data-wdh-row="' + key + '"]');
      if (!tr && val) {
        tr = document.createElement('tr');
        tr.setAttribute('data-wdh-row', key);
        var tdCls = 'wdh-table__value' + (muted ? ' wdh-table__value--muted' : '');
        tr.innerHTML =
          '<th class="wdh-table__label" scope="row">' +
          label +
          '</th><td class="' +
          tdCls +
          '"><span data-wdh-field="' +
          key +
          '"></span></td>';
        var before = findInsertBefore(tbody, root, index);
        if (before) tbody.insertBefore(tr, before);
        else tbody.appendChild(tr);
      }

      if (tr) {
        tr.hidden = !val;
        var span = tr.querySelector('[data-wdh-field="' + key + '"]');
        if (span) span.textContent = val;
      }
    });
  }

  function updatePanel(root, data, variantId, variantTitle) {
    if (!data || !data.variants) return;
    var key = String(variantId);
    var entry = data.variants[key];
    if (!entry) return;

    var fallback = data.fallbackImage || '';
    var src = pickImageUrl(entry, fallback);
    if (!src && fallback) src = String(fallback).trim();

    var figure = root.querySelector('.wdh__media');
    var img = root.querySelector('.wdh__image');
    if (figure && src) {
      if (!img) {
        img = document.createElement('img');
        img.className = 'wdh__image';
        img.loading = 'lazy';
        img.decoding = 'async';
        figure.appendChild(img);
      }
      img.src = src;
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      if (variantTitle) {
        img.alt = (data.productTitle ? data.productTitle + ' — ' : '') + variantTitle;
      } else if (data.productTitle) {
        img.alt = data.productTitle;
      }
    } else if (img && !src) {
      img.removeAttribute('src');
    }

    syncTableRows(root, entry);
  }

  function initRoot(root) {
    if (root.dataset.wdhInitialized === 'true') return;
    root.dataset.wdhInitialized = 'true';

    var data = parseData(root);
    if (!data || !data.variants) return;

    var variantId = getVariantIdFromUrl();
    if (variantId == null || !data.variants[String(variantId)]) {
      var initial = parseInt(root.dataset.initialVariantId, 10);
      variantId = Number.isFinite(initial) ? initial : null;
    }
    if (variantId == null) return;

    var initialTitle = root.dataset.initialVariantTitle || '';
    updatePanel(root, data, variantId, initialTitle);

    var onVariantChange = function (event) {
      var v = event && event.data && event.data.variant;
      if (!v || v.id == null) return;
      if (!data.variants[String(v.id)]) return;
      updatePanel(root, data, v.id, v.title || '');
    };

    if (typeof subscribe === 'function') {
      subscribe(PUB_SUB_EVENTS.variantChange, onVariantChange);
    }

    window.addEventListener('popstate', function () {
      var id = getVariantIdFromUrl();
      if (id != null && data.variants[String(id)]) {
        updatePanel(root, data, id, '');
      }
    });
  }

  function boot(container) {
    var scope = container && container.querySelectorAll ? container : document;
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
