(function() {
	class AppleTVLikePlayer {
		constructor(video) {
			if (!(video instanceof HTMLVideoElement)) return;
			if (!video.parentNode) return;

			if (video.dataset.atvpEnhanced === "1") return;
			if (video.closest && video.closest(".atvp")) {
				video.dataset.atvpEnhanced = "1";
				return;
			}
			video.dataset.atvpEnhanced = "1";

			this.video = video;

			this.IDLE_MS = 1000;
			this.SKIP_SEC = 10;

			this.FS_PRE_MS = 300;
			this.FS_POST_MS = 80;
			this.FS_EASE = "cubic-bezier(.25,.9,.3,1)";

			this._idleTimer = null;
			this._isDragging = false;
			this._hasEverPlayed = false;
			this._fsAnimLock = false;

			this._lastVolume = Math.max(0.5, Number(this.video.volume) || 0.5);

			this.icons = this._getIcons();
			this._initUI();
			this._bindEvents();

			this._fixWrapperLayout();
			this._syncUI();
			this._updateVolumeUI(true);
			this._updateScrimBackground();
		}

		// ---------- public ----------
		static auto(root = document) {
			const initAll = () => {
				const scope = root && root.querySelectorAll ? root : document;
				scope.querySelectorAll("video").forEach((v) => AppleTVLikePlayer.enhance(v));
			};

			if (document.readyState === "loading") {
				document.addEventListener("DOMContentLoaded", initAll, {
					once: true
				});
			} else {
				initAll();
			}

			AppleTVLikePlayer._ensureObserver();
		}

		static enhance(video) {
			if (!(video instanceof HTMLVideoElement)) return;
			if (video.dataset.atvpEnhanced === "1") return;
			if (video.closest && video.closest(".atvp")) {
				video.dataset.atvpEnhanced = "1";
				return;
			}
			new AppleTVLikePlayer(video);
		}

		static _ensureObserver() {
			if (AppleTVLikePlayer._observerInstalled) return;
			AppleTVLikePlayer._observerInstalled = true;

			const obs = new MutationObserver((mutations) => {
				for (const m of mutations) {
					if (!m.addedNodes) continue;
					m.addedNodes.forEach((node) => {
						if (!(node instanceof Element)) return;
						if (node.tagName === "VIDEO") {
							AppleTVLikePlayer.enhance(node);
							return;
						}
						const vids = node.querySelectorAll ? node.querySelectorAll("video") :
					[];
						if (vids && vids.length) vids.forEach((v) => AppleTVLikePlayer.enhance(
							v));
					});
				}
			});

			obs.observe(document.documentElement || document.body, {
				childList: true,
				subtree: true,
			});
		}

		// ---------- icons ----------
		_getIcons() {
			return {
				play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="96.69 30.35 93.5 97.51" fill="ffffff"><path d="M113.428 127.863c2.588 0 5.03-.733 8.448-2.686l60.302-35.01c4.883-2.88 8.008-6.103 8.008-11.084 0-4.98-3.125-8.203-8.008-11.035l-60.302-35.01c-3.418-2.002-5.86-2.685-8.448-2.685-5.566 0-10.742 4.248-10.742 11.67v74.17c0 7.422 5.176 11.67 10.742 11.67Z"/></svg>`,
				pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="104.23 34.94 74.91 88.23" fill="ffffff"><path d="M113.411 123.175h12.94c6.103 0 9.13-3.027 9.13-9.13V44.073c0-5.86-3.027-8.936-9.13-9.131h-12.94c-6.103 0-9.18 3.027-9.18 9.13v69.971c-.146 6.104 2.881 9.131 9.18 9.131Zm43.604 0h12.939c6.104 0 9.18-3.027 9.18-9.13V44.073c0-5.86-3.076-9.131-9.18-9.131h-12.94c-6.103 0-9.18 3.027-9.18 9.13v69.971c0 6.104 2.93 9.131 9.18 9.131Z"/></svg>`,
				back10: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="84.21 19.76 99.61 109.08" fill="ffffff"><path d="M84.205 79.035c0 27.246 22.608 49.804 49.805 49.804 27.246 0 49.805-22.558 49.805-49.804 0-24.024-17.53-44.385-40.381-48.877v-6.934c0-3.467-2.393-4.395-5.03-2.49l-15.576 10.888c-2.246 1.563-2.295 3.907 0 5.518l15.528 10.938c2.685 1.953 5.078 1.025 5.078-2.49v-6.934c18.457 4.199 32.031 20.605 32.031 40.38 0 23.047-18.408 41.504-41.455 41.504-23.047 0-41.553-18.457-41.504-41.503.049-13.868 6.787-26.124 17.188-33.545 2.002-1.514 2.636-3.809 1.416-5.86-1.221-2.002-3.907-2.539-6.055-.879-12.549 9.131-20.85 23.877-20.85 40.284Zm61.866 20.556c8.105 0 13.427-7.666 13.427-19.385 0-11.816-5.322-19.58-13.427-19.58-8.106 0-13.428 7.764-13.428 19.58 0 11.72 5.322 19.385 13.428 19.385Zm-25.44-.586c1.904 0 3.125-1.318 3.125-3.369V64.923c0-2.392-1.27-3.906-3.467-3.906-1.318 0-2.246.44-4.052 1.611l-6.739 4.541c-1.074.782-1.611 1.66-1.611 2.832 0 1.612 1.27 2.979 2.832 2.979.928 0 1.367-.195 2.344-.879l4.54-3.32v26.855c0 2.002 1.173 3.37 3.028 3.37Zm25.44-5.322c-4.297 0-7.08-5.127-7.08-13.477 0-8.496 2.734-13.671 7.08-13.671 4.345 0 7.03 5.126 7.03 13.671 0 8.35-2.734 13.477-7.03 13.477Z"/></svg>`,
				forward10: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="84.21 19.78 99.61 109.06" fill="ffffff"><path d="M84.205 79.035c0 27.246 22.608 49.804 49.805 49.804 27.246 0 49.805-22.558 49.805-49.804 0-16.407-8.301-31.153-20.85-40.284-2.148-1.66-4.834-1.123-6.055.88-1.22 2.05-.586 4.345 1.416 5.859 10.4 7.421 17.139 19.677 17.188 33.545.049 23.046-18.457 41.503-41.504 41.503-23.047 0-41.455-18.457-41.455-41.503 0-19.776 13.574-36.182 32.031-40.381v6.982c0 3.467 2.393 4.395 5.078 2.49L145.24 37.19c2.198-1.514 2.247-3.858 0-5.469l-15.527-10.937c-2.734-1.954-5.127-1.026-5.127 2.49v6.885c-22.851 4.492-40.38 24.853-40.38 48.877Zm61.621 20.556c8.106 0 13.428-7.666 13.428-19.385 0-11.816-5.322-19.58-13.428-19.58-8.105 0-13.427 7.764-13.427 19.58 0 11.72 5.322 19.385 13.427 19.385Zm-25.44-.586c1.905 0 3.126-1.318 3.126-3.369V64.923c0-2.392-1.27-3.906-3.467-3.906-1.318 0-2.246.44-4.053 1.611l-6.738 4.541c-1.074.782-1.611 1.66-1.611 2.832 0 1.612 1.27 2.979 2.832 2.979.928 0 1.367-.195 2.344-.879l4.54-3.32v26.855c0 2.002 1.172 3.37 3.028 3.37Zm25.44-5.322c-4.296 0-7.08-5.127-7.08-13.477 0-8.496 2.735-13.671 7.08-13.671 4.346 0 7.032 5.126 7.032 13.671 0 8.35-2.735 13.477-7.032 13.477Z"/></svg>`,
				volumeNone: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><g id="Volume"><path id="0" data-name="0" d="M2,16H5.889l5.295,4.332A.5.5,0,0,0,12,19.945V4.055a.5.5,0,0,0-.817-.387L5.889,8H2A1,1,0,0,0,1,9v6A1,1,0,0,0,2,16Z" /><path id="1" data-name="1" opacity="0.3" d="M18,12a5.989,5.989,0,0,0-2.287-4.713L14.284,8.716a4,4,0,0,1,0,6.568l1.429,1.429A5.989,5.989,0,0,0,18,12Z" /><path id="2" data-name="2" opacity="0.3" d="M23,12a10.974,10.974,0,0,1-3.738,8.262l-1.418-1.418a9,9,0,0,0,0-13.689l1.418-1.418A10.974,10.974,0,0,1,23,12Z" /></g></svg>`,
				volumeMid: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><g id="Volume"><path id="0" data-name="0" d="M2,16H5.889l5.295,4.332A.5.5,0,0,0,12,19.945V4.055a.5.5,0,0,0-.817-.387L5.889,8H2A1,1,0,0,0,1,9v6A1,1,0,0,0,2,16Z" /><path id="1" data-name="1"  d="M18,12a5.989,5.989,0,0,0-2.287-4.713L14.284,8.716a4,4,0,0,1,0,6.568l1.429,1.429A5.989,5.989,0,0,0,18,12Z" /><path id="2" data-name="2" opacity="0.3" d="M23,12a10.974,10.974,0,0,1-3.738,8.262l-1.418-1.418a9,9,0,0,0,0-13.689l1.418-1.418A10.974,10.974,0,0,1,23,12Z" /></g></svg>`,
				volumeHigh: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><g id="Volume"><path id="0" data-name="0" d="M2,16H5.889l5.295,4.332A.5.5,0,0,0,12,19.945V4.055a.5.5,0,0,0-.817-.387L5.889,8H2A1,1,0,0,0,1,9v6A1,1,0,0,0,2,16Z" /><path id="1" data-name="1" d="M18,12a5.989,5.989,0,0,0-2.287-4.713L14.284,8.716a4,4,0,0,1,0,6.568l1.429,1.429A5.989,5.989,0,0,0,18,12Z" /><path id="2" data-name="2" d="M23,12a10.974,10.974,0,0,1-3.738,8.262l-1.418-1.418a9,9,0,0,0,0-13.689l1.418-1.418A10.974,10.974,0,0,1,23,12Z" /></g></svg>`,
				muted: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="ffffff"><path d="M5.88889 16.0001H2C1.44772 16.0001 1 15.5524 1 15.0001V9.00007C1 8.44778 1.44772 8.00007 2 8.00007H5.88889L11.1834 3.66821C11.3971 3.49335 11.7121 3.52485 11.887 3.73857C11.9601 3.8279 12 3.93977 12 4.05519V19.9449C12 20.2211 11.7761 20.4449 11.5 20.4449C11.3846 20.4449 11.2727 20.405 11.1834 20.3319L5.88889 16.0001ZM20.4142 12.0001L23.9497 15.5356L22.5355 16.9498L19 13.4143L15.4645 16.9498L14.0503 15.5356L17.5858 12.0001L14.0503 8.46454L15.4645 7.05032L19 10.5859L22.5355 7.05032L23.9497 8.46454L20.4142 12.0001Z"></path></svg>`,
				fullscreen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="ffffff"><path d="M8 3V5H4V9H2V3H8ZM2 21V15H4V19H8V21H2ZM22 21H16V19H20V15H22V21ZM22 9H20V5H16V3H22V9Z"></path></svg>`,
				exitFullscreen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="ffffff"><path d="M18 7H22V9H16V3H18V7ZM8 9H2V7H6V3H8V9ZM18 17V21H16V15H22V17H18ZM8 15V21H6V17H2V15H8Z"></path></svg>`,
			};
		}

		// ---------- ui ----------
		_initUI() {
			this.video.controls = false;
			this.video.removeAttribute("controls");
			this.video.setAttribute("controlslist", "nodownload noplaybackrate noremoteplayback");
			this.video.setAttribute("playsinline", "");
			this.video.setAttribute("webkit-playsinline", "");

			this.container = document.createElement("div");
			this.container.className = "atvp";
			this.container.style.aspectRatio = "16 / 9";
			this.container.style.width = "100%";

			this.video.parentNode.insertBefore(this.container, this.video);
			this.container.appendChild(this.video);

			this.video.style.display = "block";
			this.video.style.marginLeft = "auto";
			this.video.style.marginRight = "auto";
			this.video.style.objectFit = "contain";
			this.video.style.background = "#000";

			this.container.insertAdjacentHTML(
				"beforeend",
				`
        <div class="atvp__overlay">
          <div class="atvp__scrim"></div>
          <div class="atvp__chrome">
            <div class="atvp__center">
              <button class="atvp__btn atvp__btn--side" data-act="rewind">${this.icons.back10}</button>
              <button class="atvp__btn atvp__btn--main" data-act="toggle">${this.icons.play}</button>
              <button class="atvp__btn atvp__btn--side" data-act="forward">${this.icons.forward10}</button>
            </div>

            <div class="atvp__bottom">
              <span class="atvp__time" data-el="current">0:00</span>
              <div class="atvp__progress-container" data-el="progress">
                <div class="atvp__progress-fill" data-el="fill"></div>
              </div>
              <span class="atvp__time" data-el="duration">0:00</span>

              <div class="atvp__right-actions">
                <div class="atvp__volume-box">
                  <button class="atvp__vol-btn" data-act="mute" aria-label="toggle mute">
                    <div class="atvp__icon-sm" data-el="volIcon">${this.icons.volHigh}</div>
                  </button>
                  <input type="range" min="0" max="1" step="0.01" class="atvp__vol-slider" data-el="vol">
                </div>

                <button class="atvp__fs-btn" data-act="fullscreen" aria-label="fullscreen">
                  <div class="atvp__icon-sm" data-el="fsIcon">${this.icons.fullscreen}</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      `
			);

			this.ui = {
				scrim: this.container.querySelector(".atvp__scrim"),
				chrome: this.container.querySelector(".atvp__chrome"),
				mainBtn: this.container.querySelector('[data-act="toggle"]'),
				progress: this.container.querySelector('[data-el="progress"]'),
				fill: this.container.querySelector('[data-el="fill"]'),
				current: this.container.querySelector('[data-el="current"]'),
				duration: this.container.querySelector('[data-el="duration"]'),
				volume: this.container.querySelector('[data-el="vol"]'),
				volIcon: this.container.querySelector('[data-el="volIcon"]'),
				fsIcon: this.container.querySelector('[data-el="fsIcon"]'),
			};

			this.ui.volume.value = String(this.video.volume ?? 1);

			// --- Safari audio safety: unmute & restore volume if stuck at 0 ---
			if (this.video.muted) this.video.muted = false;

			// Safari 有时会把某些页面的视频继承为 volume=0
			if ((Number(this.video.volume) || 0) <= 0.0001) {
				const restore = Math.max(0.2, Number(this._lastVolume) || 0.6);
				this.video.volume = restore;
			}
		}

		// ---------- FIX: wrapper portrait layout ----------
		_fixWrapperLayout() {
			const wrapper = this.container.closest(".video-wrapper");
			if (!wrapper) return;

			wrapper.style.display = "flex";
			wrapper.style.justifyContent = "center";
			wrapper.style.alignItems = "center";

			const w = this.video.videoWidth || 0;
			const h = this.video.videoHeight || 0;

			if (!w || !h) {
				this.container.style.width = "100%";
				this.video.style.width = "100%";
				this.video.style.height = "100%";
				return;
			}

			wrapper.style.aspectRatio = `${w} / ${h}`;

			const isPortrait = h > w;

			if (document.fullscreenElement === this.container) {
				wrapper.style.maxHeight = "";
				wrapper.style.width = "100%";
				wrapper.style.height = "100%";
				this.container.style.width = "100%";
				this.container.style.height = "100%";
				this.video.style.width = "100%";
				this.video.style.height = "100%";
				return;
			}

			if (isPortrait) {
				wrapper.style.maxHeight = "80vh";
				wrapper.style.height = "80vh";
				wrapper.style.width = "auto";
				wrapper.style.maxWidth = "100%";

				this.container.style.width = "auto";
				this.container.style.height = "100%";
				this.container.style.maxHeight = "80vh";
				this.container.style.aspectRatio = `${w} / ${h}`;

				this.video.style.height = "100%";
				this.video.style.width = "auto";
				this.video.style.maxWidth = "100%";
				this.video.style.maxHeight = "100%";
			} else {
				wrapper.style.maxHeight = "";
				wrapper.style.height = "auto";
				wrapper.style.width = "100%";
				wrapper.style.maxWidth = "100%";

				this.container.style.width = "100%";
				this.container.style.height = "auto";
				this.container.style.aspectRatio = `${w} / ${h}`;

				this.video.style.width = "100%";
				this.video.style.height = "100%";
				this.video.style.maxWidth = "100%";
			}
		}

		// ---------- scrim ----------
		_scrimGradient() {
			return `radial-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0) 40%),
              linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 25%)`;
		}

		_updateScrimBackground() {
			if (!this.ui.scrim) return;
			this.ui.scrim.style.background = this._hasEverPlayed ? this._scrimGradient() : "none";
		}

		// ---------- volume ----------
		_setRangeFill(el, value01) {
			const p = Math.max(0, Math.min(1, value01));
			const pct = (p * 100).toFixed(2);
			el.style.background = `linear-gradient(to right,
        rgba(255,255,255,1) 0%,
        rgba(255,255,255,1) ${pct}%,
        rgba(255,255,255,0.3) ${pct}%,
        rgba(255,255,255,0.3) 100%)`;
		}

		_pickVolumeIcon(v) {
			if (v <= 0.0001) return this.icons.muted;
			if (v <= 0.2) return this.icons.volumeNone;
			if (v <= 0.6) return this.icons.volumeMid;
			return this.icons.volumeHigh;
		}

		_updateVolumeUI(force = false) {
			const v = Number(this.video.volume);
			const muted = !!this.video.muted || v <= 0.0001;

			if (!muted) this._lastVolume = v;

			if (force || Number(this.ui.volume.value) !== v) {
				this.ui.volume.value = String(v);
			}

			this._setRangeFill(this.ui.volume, muted ? 0 : v);
			this.ui.volIcon.innerHTML = this._pickVolumeIcon(muted ? 0 : v);
		}

		_toggleMute() {
			if (!this.video.muted && this.video.volume > 0.0001) {
				this._lastVolume = this.video.volume;
				this.video.muted = true;
			} else {
				this.video.muted = false;
				const restore = Math.max(0.05, Number(this._lastVolume) || 0.5);
				this.video.volume = restore;
			}
			this._updateVolumeUI(true);
			this._wakeUI();
		}

		// ---------- events ----------
		_bindEvents() {
			this.container.addEventListener("click", (e) => {
				this._wakeUI();
				const btn = e.target.closest ? e.target.closest("[data-act]") : null;

				if (!btn) {
					const t = e.target;
					if (
						t.classList &&
						(t.classList.contains("atvp__scrim") ||
							t.classList.contains("atvp__overlay") ||
							t.classList.contains("atvp__chrome") ||
							t.classList.contains("atvp__center"))
					) {
						this._togglePlay();
					}
					return;
				}

				const action = btn.dataset.act;
				if (action === "toggle") this._togglePlay();
				else if (action === "rewind") this._skip(-this.SKIP_SEC);
				else if (action === "forward") this._skip(this.SKIP_SEC);
				else if (action === "fullscreen") this._toggleFullscreenAnimatedNoDelay();
				else if (action === "mute") this._toggleMute();
			});

			this.ui.volume.addEventListener("click", (e) => e.stopPropagation());
			this.ui.volume.addEventListener("input", (e) => {
				const v = Number(e.target.value);
				this.video.volume = v;
				this._updateVolumeUI(true);
				this._wakeUI();
			});

			this.video.addEventListener("volumechange", () => {
				// keep icon + slider fill synced even if volume changed elsewhere
				this._updateVolumeUI(true);
			});

			this.video.addEventListener("play", () => {
				this._hasEverPlayed = true;
				this._updateScrimBackground();
				this._syncUI();
			});
			this.video.addEventListener("pause", () => this._syncUI());
			this.video.addEventListener("ended", () => this._syncUI());
			this.video.addEventListener("timeupdate", () => this._updateProgress());

			this.video.addEventListener("loadedmetadata", () => {
				this.ui.duration.innerText = this._formatTime(this.video.duration);
				this._fixWrapperLayout();
				this._updateProgress();
			});

			this.video.addEventListener("resize", () => this._fixWrapperLayout());

			// smooth scrub
			const seekByClientX = (clientX) => {
				if (!this.video.duration || isNaN(this.video.duration)) return;
				const rect = this.ui.progress.getBoundingClientRect();
				const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
				this.video.currentTime = pos * this.video.duration;
				this._renderProgress(this.video.currentTime);
			};

			this.ui.progress.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this._wakeUI();
				this._isDragging = true;
				this.ui.progress.setPointerCapture?.(e.pointerId);
				seekByClientX(e.clientX);
			});

			this.ui.progress.addEventListener("pointermove", (e) => {
				if (!this._isDragging) return;
				e.preventDefault();
				e.stopPropagation();
				this._wakeUI();
				seekByClientX(e.clientX);
			});

			const endDrag = (e) => {
				if (!this._isDragging) return;
				e.preventDefault?.();
				e.stopPropagation?.();
				this._isDragging = false;
				this._wakeUI();
			};

			this.ui.progress.addEventListener("pointerup", endDrag);
			this.ui.progress.addEventListener("pointercancel", endDrag);
			this.ui.progress.addEventListener("lostpointercapture", () => (this._isDragging = false));

			const wake = () => this._wakeUI();
			this.container.addEventListener("pointermove", wake);
			this.container.addEventListener("pointerdown", wake);
			this.video.addEventListener("pointermove", wake);
			this.video.addEventListener("pointerdown", wake);

			document.addEventListener("fullscreenchange", () => {
				const isThis = document.fullscreenElement === this.container;
				this.ui.fsIcon.innerHTML = isThis ? this.icons.exitFullscreen : this.icons.fullscreen;
				this._fixWrapperLayout();
				this._animateFullscreenPost(isThis);
				this._fsAnimLock = false;
				this._wakeUI();
			});

			// ---------- keyboard shortcuts ----------
			// Space: play/pause
			// Enter: fullscreen toggle
			// Only active when this player is "focused" (clicked/hovered) to avoid hijacking page typing.
			this._kbdActive = false;

			// Make container focusable so it can receive focus naturally
			if (!this.container.hasAttribute("tabindex")) this.container.setAttribute("tabindex", "0");

			const isTypingTarget = (el) => {
				if (!el) return false;
				const tag = (el.tagName || "").toUpperCase();
				return (
					tag === "INPUT" ||
					tag === "TEXTAREA" ||
					tag === "SELECT" ||
					el.isContentEditable ||
					(el.closest && !!el.closest('[contenteditable="true"]'))
				);
			};

			// Activate keyboard for this player after user interacts with it
			const activateKbd = () => {
				this._kbdActive = true;
				// give it focus for free keyboard usage
				this.container.focus?.({
					preventScroll: true
				});
			};

			// deactivate when clicking elsewhere
			const deactivateKbd = (e) => {
				if (!e?.target) return;
				if (this.container.contains(e.target)) return;
				this._kbdActive = false;
			};

			this.container.addEventListener("pointerdown", activateKbd);
			this.container.addEventListener("click", activateKbd);
			document.addEventListener("pointerdown", deactivateKbd, true);

			this._onKeyDown = (e) => {
				// if user is typing, never hijack
				if (isTypingTarget(e.target)) return;

				// require this player to be active (focused) OR currently fullscreen
				const isThisFullscreen = document.fullscreenElement === this.container;
				const shouldHandle = this._kbdActive || isThisFullscreen;
				if (!shouldHandle) return;

				// avoid interfering with browser/system shortcuts
				if (e.ctrlKey || e.metaKey || e.altKey) return;

				// Space (modern browsers: " " or "Spacebar", code: "Space")
				if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
					e.preventDefault();
					this._togglePlay();
					this._wakeUI();
					return;
				}

				// Enter: fullscreen toggle
				if (e.code === "Enter" || e.key === "Enter") {
					e.preventDefault();
					this._toggleFullscreenAnimatedNoDelay();
					this._wakeUI();
					return;
				}
			};

			document.addEventListener("keydown", this._onKeyDown, {
				passive: false
			});
		}

		// ---------- playback ----------
		_togglePlay() {
			this.video.paused ? this.video.play() : this.video.pause();
		}

		_syncUI() {
			const paused = this.video.paused;
			const playing = !paused && !this.video.ended;
			const isUnplayed = !this._hasEverPlayed && this.video.currentTime <= 0;

			this.container.classList.toggle("is-unplayed", isUnplayed);
			this.container.classList.toggle("is-playing", !isUnplayed && playing);
			this.container.classList.toggle("is-paused", !isUnplayed && !playing);

			this.ui.mainBtn.innerHTML = paused ? this.icons.play : this.icons.pause;

			clearTimeout(this._idleTimer);
			this.container.classList.remove("is-idle");
			if (!isUnplayed && playing) this._armIdle();
		}

		_wakeUI() {
			this.container.classList.remove("is-idle");
			clearTimeout(this._idleTimer);
			if (this.container.classList.contains("is-playing")) this._armIdle();
		}

		_armIdle() {
			clearTimeout(this._idleTimer);
			this._idleTimer = setTimeout(() => {
				if (this.container.classList.contains("is-playing")) {
					this.container.classList.add("is-idle");
				}
			}, this.IDLE_MS);
		}

		_skip(val) {
			if (!this.video.duration || isNaN(this.video.duration)) return;
			const t = Math.max(0, Math.min(this.video.duration, this.video.currentTime + val));
			this.video.currentTime = t;
			this._renderProgress(t);
			this._wakeUI();
		}

		// ---------- fullscreen animation ----------
		_toggleFullscreenAnimatedNoDelay() {
			if (this._fsAnimLock) return;
			this._fsAnimLock = true;

			const inFs = !!document.fullscreenElement;
			const isThis = document.fullscreenElement === this.container;

			if (inFs && !isThis) {
				document.exitFullscreen?.().catch(() => {});
				return;
			}

			this._animateFullscreenPre(!inFs);

			if (!inFs) {
				this.container.requestFullscreen?.().catch(() => (this._fsAnimLock = false));
			} else {
				document.exitFullscreen?.().catch(() => (this._fsAnimLock = false));
			}
		}

		_canAnimate(el) {
			return !!(el && el.animate);
		}

		_animateFullscreenPre(entering) {
			if (!this._canAnimate(this.container)) return;
			this.container.classList.remove("is-idle");

			const kf = entering ? [{
				transform: "scale(1)"
			}, {
				transform: "scale(1.015)"
			}] : [{
				transform: "scale(1)"
			}, {
				transform: "scale(0.99)"
			}];

			this.container.animate(kf, {
				duration: this.FS_PRE_MS,
				easing: this.FS_EASE,
				fill: "forwards",
			});

			this.ui.chrome?.animate([{
				opacity: 1
			}, {
				opacity: 0.98
			}], {
				duration: this.FS_PRE_MS,
				easing: this.FS_EASE,
				fill: "forwards",
			});
		}

		_animateFullscreenPost(isNowFullscreen) {
			if (!this._canAnimate(this.container)) return;

			const kf = isNowFullscreen ? [{
				transform: "scale(0.99)"
			}, {
				transform: "scale(1)"
			}] : [{
				transform: "scale(0.995)"
			}, {
				transform: "scale(1)"
			}];

			const a1 = this.container.animate(kf, {
				duration: this.FS_POST_MS,
				easing: this.FS_EASE,
				fill: "forwards",
			});

			const a2 = this.ui.chrome?.animate([{
				opacity: 0.98
			}, {
				opacity: 1
			}], {
				duration: this.FS_POST_MS,
				easing: this.FS_EASE,
				fill: "forwards",
			});

			Promise.allSettled([a1.finished, a2?.finished].filter(Boolean)).then(() => {
				this.container.style.transform = "";
			});
		}

		// ---------- progress ----------
		_updateProgress() {
			if (this._isDragging) return;
			if (!this.video.duration || isNaN(this.video.duration)) return;
			this._renderProgress(this.video.currentTime);
		}

		_renderProgress(currentTime) {
			const percent = (currentTime / this.video.duration) * 100;
			this.ui.fill.style.width = `${percent}%`;
			this.ui.current.innerText = this._formatTime(currentTime);
		}

		_formatTime(s) {
			if (!s || isNaN(s)) return "0:00";
			const m = Math.floor(s / 60);
			const sec = Math.floor(s % 60);
			return `${m}:${sec < 10 ? "0" : ""}${sec}`;
		}
	}

	window.AppleTVLikePlayer = AppleTVLikePlayer;
	AppleTVLikePlayer.auto();
})();