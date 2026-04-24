/**
 * pro-workshop: variant-selects 内の <select> で、文言に「M月D日」が含まれる option を日付順に並べ替える。
 * - 文言に「YYYY年」があればその年を使用。
 * - 年が無い場合は現在年で解釈し、当日より 90 日以上過去に落ちる場合は翌年として解釈（年またぎのざっくり補正）。
 * - 日付が 2 件未満しか解釈できない select は触らない（サイズなど別オプション用）。
 */
(function () {
  'use strict';

  var JP_MD_RE = /(\d{1,2})月(\d{1,2})日/;
  var JP_YEAR_RE = /(\d{4})年/;

  function optionSortKey(text, index) {
    var t = String(text).trim();
    var md = t.match(JP_MD_RE);
    if (!md) {
      return 1e12 + index;
    }
    var month = parseInt(md[1], 10);
    var day = parseInt(md[2], 10);
    var yearMatch = t.match(JP_YEAR_RE);
    var year = yearMatch ? parseInt(yearMatch[1], 10) : null;

    if (year == null) {
      var now = new Date();
      year = now.getFullYear();
      var candidate = new Date(year, month - 1, day);
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (candidate.getTime() < today.getTime() - 90 * 86400000) {
        year += 1;
      }
    }

    return year * 10000 + month * 100 + day;
  }

  function sortVariantSelectOptions(select) {
    if (!select || select.tagName !== 'SELECT') return;

    var options = Array.prototype.slice.call(select.querySelectorAll('option'));
    if (options.length < 2) return;

    var withKeys = options.map(function (opt, i) {
      return {
        el: opt,
        key: optionSortKey(opt.textContent || '', i),
        index: i,
      };
    });

    var parseableCount = withKeys.filter(function (x) {
      return x.key < 1e12;
    }).length;
    if (parseableCount < 2) return;

    withKeys.sort(function (a, b) {
      if (a.key !== b.key) return a.key - b.key;
      return a.index - b.index;
    });

    var selectedValue = select.value;
    var fragment = document.createDocumentFragment();
    withKeys.forEach(function (x) {
      fragment.appendChild(x.el);
    });
    select.appendChild(fragment);

    if (selectedValue != null && selectedValue !== '') {
      select.value = selectedValue;
    }
  }

  function sortAllVariantSelects() {
    document.querySelectorAll('variant-selects select.select__select').forEach(sortVariantSelectOptions);
  }

  function scheduleSort() {
    requestAnimationFrame(sortAllVariantSelects);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSort);
  } else {
    scheduleSort();
  }

  document.addEventListener('product-info:loaded', scheduleSort);

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.variantChange, scheduleSort);
  }
})();
