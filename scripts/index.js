// ── Mobile menu toggle with animated bars ──
        const menuBtn  = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const bar1 = document.getElementById('bar1');
        const bar2 = document.getElementById('bar2');
        const bar3 = document.getElementById('bar3');
        let menuOpen = false;

        menuBtn.addEventListener('click', () => {
            menuOpen = !menuOpen;
            mobileMenu.classList.toggle('hidden', !menuOpen);
            // Animate into X
            if (menuOpen) {
                bar1.style.transform = 'translateY(8px) rotate(45deg)';
                bar2.style.opacity = '0';
                bar3.style.transform = 'translateY(-8px) rotate(-45deg)';
            } else {
                bar1.style.transform = '';
                bar2.style.opacity = '1';
                bar3.style.transform = '';
            }
        });

        // ── Canvas setup ──
        const video  = document.getElementById('src-video');
        const canvas = document.getElementById('video-canvas');
        const ctx    = canvas.getContext('2d');

        function isMobile() { return window.innerWidth < 768; }

        function coverVideo() {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (!vw || !vh) return false;

            if (isMobile()) {
                // On mobile: inset 16px each side, maintain 16:9 ratio
                const targetW = window.innerWidth - 32;
                const targetH = targetW * (9 / 16);
                video.style.width        = targetW + 'px';
                video.style.height       = targetH + 'px';
                video.style.borderRadius = '18px';
            } else {
                // Desktop: full cover
                const sw = window.innerWidth;
                const sh = window.innerHeight;
                const scale = Math.max(sw / vw, sh / vh);
                video.style.width        = Math.ceil(vw * scale) + 'px';
                video.style.height       = Math.ceil(vh * scale) + 'px';
                video.style.borderRadius = '0';
            }
            return true;
        }

        function resizeAll() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            coverVideo();
        }

        // Keep trying until video dimensions are available
        const coverInterval = setInterval(() => {
            if (coverVideo()) clearInterval(coverInterval);
        }, 100);

        resizeAll();
        window.addEventListener('resize', resizeAll);
        window.addEventListener('orientationchange', () => setTimeout(resizeAll, 300));
        video.addEventListener('loadedmetadata', resizeAll);
        video.addEventListener('canplay', resizeAll);

        // ── Draw lens iris mask ──
        function drawMask(progress) {
            const W  = canvas.width;
            const H  = canvas.height;
            const cx = W / 2;
            const cy = H / 2;

            const maxR = Math.sqrt(cx * cx + cy * cy) * 1.05;

            // Smaller starting iris on mobile so the effect reads clearly
            const isMobile = W < 768;
            const minR = Math.min(W, H) * (isMobile ? 0.10 : 0.13);

            const irisR = minR + (maxR - minR) * progress;

            ctx.clearRect(0, 0, W, H);

            // Black fill
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);

            // Decorative lens rings — scale with viewport
            const rings = [minR * 1.6, minR * 2.1, minR * 2.7];
            rings.forEach(r => {
                if (irisR < r * 1.1) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255,255,255,${0.08 * (1 - progress)})`;
                    ctx.lineWidth = isMobile ? 1 : 1.5;
                    ctx.stroke();
                }
            });

            // Soft vignette gradient on iris edge
            const gradient = ctx.createRadialGradient(cx, cy, irisR * 0.75, cx, cy, irisR);
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            // Punch the iris hole
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';

            // Bright rim around iris
            if (progress < 0.95) {
                ctx.beginPath();
                ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255,255,255,${0.15 * (1 - progress)})`;
                ctx.lineWidth = isMobile ? 1.5 : 2;
                ctx.stroke();
            }
        }

        // ── Scroll progress ──
        function getScrollProgress() {
            const driver   = document.getElementById('scroll-driver');
            const rect     = driver.getBoundingClientRect();
            const total    = driver.offsetHeight - window.innerHeight;
            const scrolled = -rect.top;
            return Math.min(Math.max(scrolled / total, 0), 1);
        }

        function easeInOut(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        let currentProgress = 0;
        let targetProgress  = 0;

        window.addEventListener('scroll', () => {
            targetProgress = easeInOut(getScrollProgress());
        }, { passive: true });

        // ── Render loop ──
        function loop() {
            currentProgress += (targetProgress - currentProgress) * 0.08;
            drawMask(currentProgress);
            requestAnimationFrame(loop);
        }

        video.addEventListener('canplay', () => {
            video.play().catch(() => {});
            loop();
        });

          window.addEventListener('load', () => {
            if (video.readyState < 2) loop();
            // iOS Safari requires a user gesture to unlock autoplay
            document.addEventListener('touchstart', () => {
                video.play().catch(() => {});
            }, { once: true });
        });

        // iOS Safari sometimes pauses video when tab goes background then returns
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                video.play().catch(() => {});
            }
        });