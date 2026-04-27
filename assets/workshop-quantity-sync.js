/**
 * Keep workshop quantity SELECT (outside form) in sync with a hidden
 * <input name="quantity"> inside the Shopify product form so that
 * dynamic checkout ("Buy it now") uses the selected quantity.
 *
 * - No layout changes (hidden input only)
 * - Works with Dawn-style section swaps (product-info replaces HTML)
 */

(() => {
  const SELECT_SELECTOR = 'select.quantity__input[data-jwb-quantity-select="true"]';
  const HIDDEN_SELECTOR = 'input[name="quantity"].jwb-hidden-quantity';

  function getTargetForm(select) {
    // If the element uses the HTML "form" attribute, browsers expose select.form.
    if (select.form) return select.form;
    const formId = select.dataset.jwbFormId || select.getAttribute('form');
    if (!formId) return null;
    return document.getElementById(formId);
  }

  function syncSelectToHidden(select) {
    const form = getTargetForm(select);
    if (!form) return;

    const hidden = form.querySelector(HIDDEN_SELECTOR) || form.querySelector('input[name="quantity"]');
    if (!hidden) return;

    const v = select.value;
    if (v != null && v !== '') {
      hidden.value = v;
      // Some Shopify accelerated checkout flows rely on input/change events
      // rather than reading .value at click time.
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function setupObserver(select) {
    if (select.__jwbQtyObserver) return;

    // When variant changes, Dawn may rebuild <option> list and set select.value programmatically.
    // That does not reliably fire 'change', so observe DOM changes in the select.
    const obs = new MutationObserver(() => syncSelectToHidden(select));
    obs.observe(select, { childList: true, subtree: true });
    select.__jwbQtyObserver = obs;
  }

  function initWithin(root = document) {
    root.querySelectorAll(SELECT_SELECTOR).forEach((select) => {
      setupObserver(select);
      syncSelectToHidden(select);
    });
  }

  function isBuyItNowClickTarget(el) {
    if (!(el instanceof Element)) return false;
    return Boolean(
      el.closest(
        [
          // Native Shopify payment button
          '.shopify-payment-button__button',
          '.shopify-payment-button',
          // Accelerated checkout custom elements
          'shopify-accelerated-checkout',
          'shopify-buy-it-now-button',
          // Some apps wrap/replace the button but keep these classes
          '.bss-po-btn-buyitnow',
        ].join(', ')
      )
    );
  }

  function syncClosestWorkshopSelectFromEventTarget(target) {
    if (!(target instanceof Element)) return;
    const root =
      target.closest('product-info') ||
      target.closest('.product__info-container') ||
      document;
    const select = root.querySelector(SELECT_SELECTOR);
    if (select) syncSelectToHidden(select);
  }

  // Event delegation for user changes
  document.addEventListener(
    'change',
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLSelectElement)) return;
      if (!t.matches(SELECT_SELECTOR)) return;
      syncSelectToHidden(t);
    },
    true
  );

  // Ensure quantity is synced immediately before accelerated checkout reads it.
  // Use capture phase so it runs before Shopify/app click handlers.
  document.addEventListener(
    'click',
    (e) => {
      if (!isBuyItNowClickTarget(e.target)) return;
      syncClosestWorkshopSelectFromEventTarget(e.target);
    },
    true
  );

  // Initial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initWithin(document));
  } else {
    initWithin(document);
  }

  // After section swaps, product-info dispatches this (see assets/product-info.js)
  document.addEventListener('product-info:loaded', (e) => {
    const root = e.target instanceof Element ? e.target : document;
    initWithin(root);
  });
})();

