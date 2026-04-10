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
    const swipeThreshold = 80;
    const swipeVerticalLimit = 42;
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

            let scale = 1;
            let pointX = 0;
            let pointY = 0;
            let startX = 0;
            let startY = 0;
            let dragging = false;

            let initialDistance = null;
            let initialScale = 1;
            let lastTap = 0;
            let touchDrag = false;

            const minScale = 1;
            const maxScale = 4;

            const clampPosition = () => {
                const rect = stage.getBoundingClientRect();
                const maxX = ((rect.width * scale) - rect.width) / 2;
                const maxY = ((rect.height * scale) - rect.height) / 2;

                if (maxX > 0) {
                    pointX = Math.max(-maxX, Math.min(maxX, pointX));
                } else {
                    pointX = 0;
                }

                if (maxY > 0) {
                    pointY = Math.max(-maxY, Math.min(maxY, pointY));
                } else {
                    pointY = 0;
                }
            };

            const updateTransform = () => {
                clampPosition();
                img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
                stage.classList.toggle("is-zoomed", scale > 1);

                if (scale <= 1 && dragging) {
                    dragging = false;
                    stage.classList.remove("dragging");
                }
            };

            const resetZoom = () => {
                scale = 1;
                pointX = 0;
                pointY = 0;
                updateTransform();
            };

            const adjustZoom = (nextScale, originX = 0, originY = 0) => {
                const oldScale = scale;
                scale = Math.min(Math.max(minScale, nextScale), maxScale);

                if (scale === 1) {
                    pointX = 0;
                    pointY = 0;
                } else {
                    const scaleRatio = scale / oldScale;
                    pointX = originX - (originX - pointX) * scaleRatio;
                    pointY = originY - (originY - pointY) * scaleRatio;
                }

                updateTransform();
            };

            const getDistance = (touches) => {
                const dx = touches[0].clientX - touches[1].clientX;
                const dy = touches[0].clientY - touches[1].clientY;
                return Math.sqrt(dx * dx + dy * dy);
            };

            stage.addEventListener("dblclick", (e) => {
                e.preventDefault();

                if (scale === 1) {
                    scale = 2.2;
                } else {
                    resetZoom();
                    return;
                }

                updateTransform();
            });

            stage.addEventListener("wheel", (e) => {
                e.preventDefault();

                const rect = stage.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;
                adjustZoom(scale + (e.deltaY < 0 ? 0.25 : -0.25), mouseX, mouseY);
            }, { passive: false });

            stage.addEventListener("mousedown", (e) => {
                if (scale <= 1) return;

                e.preventDefault();
                dragging = true;
                stage.classList.add("dragging");
                startX = e.clientX - pointX;
                startY = e.clientY - pointY;
            });

            window.addEventListener("mousemove", (e) => {
                if (!dragging) return;

                pointX = e.clientX - startX;
                pointY = e.clientY - startY;
                updateTransform();
            });

            window.addEventListener("mouseup", () => {
                dragging = false;
                stage.classList.remove("dragging");
            });

            stage.addEventListener("mouseleave", () => {
                if (!dragging) return;
                dragging = false;
                stage.classList.remove("dragging");
            });

            stage.addEventListener("touchstart", (e) => {
                const now = Date.now();

                if (e.touches.length === 1) {
                    if (now - lastTap < 300) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (scale === 1) {
                            scale = 2.2;
                        } else {
                            resetZoom();
                            lastTap = 0;
                            return;
                        }

                        updateTransform();
                    }

                    lastTap = now;

                    if (scale > 1) {
                        touchDrag = true;
                        startX = e.touches[0].clientX - pointX;
                        startY = e.touches[0].clientY - pointY;
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }

                if (e.touches.length === 2) {
                    initialDistance = getDistance(e.touches);
                    initialScale = scale;
                    touchDrag = false;
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, { passive: false });

            stage.addEventListener("touchmove", (e) => {
                if (e.touches.length === 2 && initialDistance) {
                    e.preventDefault();
                    e.stopPropagation();

                    const newDistance = getDistance(e.touches);
                    const scaleFactor = newDistance / initialDistance;

                    scale = initialScale * scaleFactor;
                    scale = Math.min(Math.max(minScale, scale), maxScale);

                    updateTransform();
                } else if (e.touches.length === 1 && touchDrag && scale > 1) {
                    e.preventDefault();
                    e.stopPropagation();

                    pointX = e.touches[0].clientX - startX;
                    pointY = e.touches[0].clientY - startY;
                    updateTransform();
                }
            }, { passive: false });

            stage.addEventListener("touchend", (e) => {
                initialDistance = null;

                if (scale > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                if (scale <= 1) {
                    touchDrag = false;
                    pointX = 0;
                    pointY = 0;
                }

                updateTransform();
            }, { passive: false });

            stage.addEventListener("touchcancel", (e) => {
                initialDistance = null;
                touchDrag = false;

                if (scale > 1) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                updateTransform();
            }, { passive: false });

            img.addEventListener("load", resetZoom);
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
