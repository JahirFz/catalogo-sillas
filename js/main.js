document.addEventListener("DOMContentLoaded", () => {
    const zoomCarousel = document.getElementById("zoomCarousel");
    const carouselInner = document.getElementById("carouselImages");
    const productCards = document.querySelectorAll(".product-card");
    let zoomCounter = null;

    productCards.forEach((card) => {
        const previewImage = card.querySelector(".zoom-click");
        const colorOptions = card.querySelectorAll(".color-option");

        if (!previewImage || colorOptions.length === 0) {
            return;
        }

        colorOptions.forEach((option) => {
            if (option.classList.contains("color-disabled")) {
                return;
            }

            option.addEventListener("click", () => {
                const nextPreview = option.dataset.preview;
                const nextImages = option.dataset.images;

                if (!nextPreview || !nextImages) {
                    return;
                }

                previewImage.src = nextPreview;
                previewImage.dataset.images = nextImages;

                colorOptions.forEach((item) => item.classList.remove("is-active"));
                option.classList.add("is-active");
            });
        });
    });

    if (!zoomCarousel || !carouselInner || typeof bootstrap === "undefined") {
        return;
    }

    let carouselInstance = null;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeTracking = false;
    const swipeThreshold = 20; // Sensibilidad alta, pero sin llegar al extremo
    const swipeVerticalLimit = 80; // Tolerancia vertical generosa
    const ensureZoomCounter = () => {
        if (zoomCounter) {
            return zoomCounter;
        }

        zoomCounter = document.createElement("div");
        zoomCounter.className = "carousel-counter";
        zoomCounter.setAttribute("aria-live", "polite");
        zoomCarousel.append(zoomCounter);

        return zoomCounter;
    };

    const updateZoomCounter = () => {
        const counter = ensureZoomCounter();
        const slides = carouselInner.querySelectorAll(".carousel-item");
        const activeIndex = Array.from(slides).findIndex((slide) => slide.classList.contains("active"));
        const total = slides.length;

        if (total === 0) {
            counter.hidden = true;
            counter.textContent = "";
            return;
        }

        counter.hidden = false;
        counter.textContent = `${activeIndex >= 0 ? activeIndex + 1 : 1} / ${total}`;
    };

    zoomCarousel.addEventListener("slid.bs.carousel", updateZoomCounter);

    const getActiveZoomStage = () => zoomCarousel.querySelector(".carousel-item.active .zoom-stage");
    const getActiveZoomImage = () => zoomCarousel.querySelector(".carousel-item.active .zoom-slide");

    zoomCarousel.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) {
            swipeTracking = false;
            return;
        }

        const activeStage = getActiveZoomStage();
        if (activeStage && activeStage.classList.contains("is-zoomed")) {
            swipeTracking = false;
            return;
        }

        swipeTracking = true;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
    }, { passive: true });

    zoomCarousel.addEventListener("touchend", (e) => {
        if (!swipeTracking || !carouselInstance || e.changedTouches.length !== 1) {
            swipeTracking = false;
            return;
        }

        const activeStage = getActiveZoomStage();
        if (activeStage && activeStage.classList.contains("is-zoomed")) {
            swipeTracking = false;
            return;
        }

        const deltaX = e.changedTouches[0].clientX - swipeStartX;
        const deltaY = e.changedTouches[0].clientY - swipeStartY;

        swipeTracking = false;

        if (Math.abs(deltaY) > swipeVerticalLimit || Math.abs(deltaX) < swipeThreshold) {
            return;
        }

        if (deltaX < 0) {
            carouselInstance.next();
        } else {
            carouselInstance.prev();
        }
    }, { passive: true });

    const activateImageZoom = () => {
        document.querySelectorAll(".zoom-stage").forEach((stage) => {
            const img = stage.querySelector(".zoom-slide");
            if (!img) return;

            let scale = 1, pointX = 0, pointY = 0, startX, startY;
            let initialDist = 0, initialScale = 1, lastTap = 0, activeDrag = false;

            const setDrag = (state, e) => {
                activeDrag = state;
                stage.classList.toggle("dragging", state);
                if (state && e) {
                    startX = (e.touches ? e.touches[0].clientX : e.clientX) - pointX;
                    startY = (e.touches ? e.touches[0].clientY : e.clientY) - pointY;
                }
            };

            const updateTransform = () => {
                const r = stage.getBoundingClientRect();
                const mX = Math.max(0, r.width * (scale - 1) / 2), mY = Math.max(0, r.height * (scale - 1) / 2);
                pointX = Math.max(-mX, Math.min(mX, pointX));
                pointY = Math.max(-mY, Math.min(mY, pointY));
                img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
                stage.classList.toggle("is-zoomed", scale > 1);
                if (scale <= 1 && activeDrag) setDrag(false);
            };

            const adjustZoom = (nScale, x = 0, y = 0) => {
                const oScale = scale;
                scale = Math.min(Math.max(1, nScale), 4);
                if (scale === 1) pointX = pointY = 0;
                else {
                    const ratio = scale / oScale;
                    pointX = x - (x - pointX) * ratio;
                    pointY = y - (y - pointY) * ratio;
                }
                updateTransform();
            };

            const handleMove = (x, y) => {
                if (!activeDrag || scale <= 1) return;
                pointX = x - startX; pointY = y - startY;
                updateTransform();
            };

            const getDist = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

            stage.addEventListener("dblclick", (e) => { e.preventDefault(); adjustZoom(scale === 1 ? 2.2 : 1); });
            stage.addEventListener("wheel", (e) => {
                e.preventDefault();
                const r = stage.getBoundingClientRect();
                adjustZoom(scale + (e.deltaY < 0 ? 0.25 : -0.25), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
            }, { passive: false });
            
            stage.addEventListener("mousedown", (e) => { if (scale > 1) { e.preventDefault(); setDrag(true, e); } });
            window.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY));
            window.addEventListener("mouseup", () => setDrag(false));
            stage.addEventListener("mouseleave", () => setDrag(false));

            stage.addEventListener("touchstart", (e) => {
                if (e.touches.length === 1) {
                    const now = Date.now();
                    if (now - lastTap < 300) { e.preventDefault(); e.stopPropagation(); adjustZoom(scale === 1 ? 2.2 : 1); lastTap = 0; }
                    else { lastTap = now; if (scale > 1) { e.preventDefault(); e.stopPropagation(); setDrag(true, e); } }
                } else if (e.touches.length === 2) {
                    e.preventDefault(); e.stopPropagation(); initialDist = getDist(e.touches); initialScale = scale; setDrag(false);
                }
            }, { passive: false });

            stage.addEventListener("touchmove", (e) => {
                if (e.touches.length === 2 && initialDist) {
                    e.preventDefault(); e.stopPropagation(); adjustZoom(initialScale * (getDist(e.touches) / initialDist));
                } else if (e.touches.length === 1) {
                    if (activeDrag && scale > 1) { e.preventDefault(); e.stopPropagation(); }
                    handleMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: false });

            ["touchend", "touchcancel"].forEach(evt => stage.addEventListener(evt, (e) => {
                initialDist = 0; 
                if (scale > 1) { e.preventDefault(); e.stopPropagation(); }
                if (scale <= 1) { pointX = pointY = 0; }
                setDrag(false); 
                updateTransform();
            }, { passive: false }));

            img.addEventListener("load", () => adjustZoom(1));
            img.addEventListener("dragstart", (e) => e.preventDefault());
        });
    };
    document.querySelectorAll(".zoom-click").forEach((image) => {
        image.addEventListener("click", () => {
            const imageList = image.dataset.images
                ? image.dataset.images.split(",").map((item) => item.trim()).filter(Boolean)
                : [image.getAttribute("src")];

            const slidesMarkup = imageList.map((src, index) => `
                <div class="carousel-item ${index === 0 ? "active" : ""}">
                    <div class="zoom-stage">
                        <img src="${src}" class="d-block w-100 img-fluid zoom-slide" alt="${image.alt || "Imagen del producto"}">
                    </div>
                </div>
            `).join("");

            carouselInner.innerHTML = slidesMarkup;
            updateZoomCounter();
            activateImageZoom();

            if (carouselInstance) {
                carouselInstance.dispose();
            }

            carouselInstance = new bootstrap.Carousel(zoomCarousel, {
                interval: false,
                touch: false,
                wrap: true
            });
        });
    });
});
