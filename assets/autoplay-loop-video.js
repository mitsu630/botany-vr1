if (!customElements.get('autoplay-loop-video')) {
  class AutoplayLoopVideo extends HTMLElement {
    connectedCallback() {
      const raw = parseFloat(this.getAttribute('data-threshold') || '0.15');
      const threshold = Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0.15));

      this._observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;

            const video = this.querySelector('video');
            if (video) {
              video.muted = true;
              video.play?.().catch(() => {});
            }

            const iframe = this.querySelector('iframe[data-src]');
            if (iframe && iframe.dataset.src && !iframe.dataset.srcApplied) {
              iframe.src = iframe.dataset.src;
              iframe.dataset.srcApplied = 'true';
            }

            this._observer.disconnect();
            this._observer = null;
            break;
          }
        },
        { rootMargin: '0px 0px 8% 0px', threshold }
      );

      this._observer.observe(this);
    }

    disconnectedCallback() {
      this._observer?.disconnect();
      this._observer = null;
    }
  }

  customElements.define('autoplay-loop-video', AutoplayLoopVideo);
}
