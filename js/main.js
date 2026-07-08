document.addEventListener("DOMContentLoaded", () => {
    const zoomCarousel = document.getElementById("zoomCarousel");
    const carouselInner = document.getElementById("carouselImages");
    let zoomCounter = null;
    const whatsappNumber = "522223882640";

    const escapeHtml = (value) => String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const renderCatalog = () => {
        const catalogGrid = document.getElementById("catalogGrid");
        const catalogType = document.body.dataset.catalog;

        if (!catalogGrid || !catalogType || !window.catalogData || !window.catalogData[catalogType]) {
            return;
        }

        catalogGrid.innerHTML = window.catalogData[catalogType].map((product) => {
            const image = product.image;
            const loading = image.loading || "lazy";
            const fetchPriority = image.fetchpriority ? ` fetchpriority="${escapeHtml(image.fetchpriority)}"` : "";
            const details = product.details.map((detail) => (
                `<p class="product-copy">${escapeHtml(detail)}</p>`
            )).join("");
            const colors = product.colors ? `
                <p class="color-label">Colores disponibles</p>
                <div class="colores" aria-label="${escapeHtml(product.colorsLabel || "Colores disponibles")}">
                    ${product.colors.map((color) => {
                        const disabledClass = color.disabled ? " color-disabled" : "";
                        const activeClass = color.active ? " is-active" : "";
                        const title = color.disabled ? `${color.name} - sin fotos` : color.name;
                        const preview = color.preview ? ` data-preview="${escapeHtml(color.preview)}"` : "";
                        const images = color.images ? ` data-images="${escapeHtml(color.images.join(","))}"` : "";

                        return `<button type="button" class="color ${escapeHtml(color.className)} color-option${disabledClass}${activeClass}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"${preview}${images}></button>`;
                    }).join("")}
                </div>
            ` : "";

            return `
                <div class="col-md-6 col-lg-4 reveal catalog-item" data-category="${escapeHtml(product.categories.join(" "))}">
                    <article class="card product-card h-100">
                        <img src="${escapeHtml(image.src)}" class="card-img-top zoom-click" data-bs-toggle="modal" data-bs-target="#zoomModal" data-images="${escapeHtml(product.gallery.join(","))}" width="${escapeHtml(image.width)}" height="${escapeHtml(image.height)}" alt="${escapeHtml(image.alt)}" loading="${escapeHtml(loading)}" decoding="async"${fetchPriority}>
                        <div class="card-body">
                            <h2 class="product-title">${escapeHtml(product.title)}</h2>
                            <div class="product-copy-group">${details}</div>
                            ${colors}
                        </div>
                    </article>
                </div>
            `;
        }).join("");
    };

    renderCatalog();

    const productCards = document.querySelectorAll(".product-card");
    const filterButtons = document.querySelectorAll(".filter-chip");
    const catalogItems = document.querySelectorAll(".catalog-item");

    /* ======== CATALOG FILTERS ======== */
    if (filterButtons.length > 0 && catalogItems.length > 0) {
        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const selectedFilter = button.dataset.filter || "all";

                filterButtons.forEach((item) => {
                    item.classList.toggle("is-active", item === button);
                    item.setAttribute("aria-pressed", item === button ? "true" : "false");
                });

                catalogItems.forEach((item) => {
                    const categories = (item.dataset.category || "").split(/\s+/);
                    const shouldShow = selectedFilter === "all" || categories.includes(selectedFilter);

                    item.hidden = !shouldShow;
                    item.classList.toggle("is-visible", shouldShow);
                });
            });

            button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
        });
    }

    /* ======== PRODUCT QUOTE CTA ======== */
    productCards.forEach((card) => {
        const title = card.querySelector(".product-title");
        const body = card.querySelector(".card-body");

        if (!title || !body || body.querySelector(".quote-button")) {
            return;
        }

        const productName = title.textContent.trim();
        const message = `Hola, quiero cotizar ${productName}`;
        const quoteButton = document.createElement("a");

        quoteButton.className = "quote-button";
        quoteButton.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        quoteButton.target = "_blank";
        quoteButton.rel = "noopener noreferrer";
        quoteButton.setAttribute("aria-label", `Cotizar ${productName} por WhatsApp`);
        quoteButton.textContent = "Cotizar este modelo";

        body.append(quoteButton);
    });

    /* ======== COLOR OPTION SWITCHING ======== */
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

                // Fade out, swap, fade in
                previewImage.style.opacity = "0";
                setTimeout(() => {
                    previewImage.src = nextPreview;
                    previewImage.dataset.images = nextImages;
                    previewImage.style.opacity = "1";
                }, 200);

                colorOptions.forEach((item) => item.classList.remove("is-active"));
                option.classList.add("is-active");
            });
        });
    });

    /* ======== SCROLL REVEAL ANIMATION ======== */
    const revealElements = document.querySelectorAll(".reveal");
    if (revealElements.length > 0 && "IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );

        revealElements.forEach((el) => revealObserver.observe(el));
    } else {
        // Fallback: show everything immediately
        revealElements.forEach((el) => el.classList.add("is-visible"));
    }

    /* ======== GALLERY MODAL / CAROUSEL ======== */
    if (!zoomCarousel || !carouselInner || typeof bootstrap === "undefined") {
        return;
    }

    let carouselInstance = null;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeTracking = false;
    const swipeThreshold = 20;
    const swipeVerticalLimit = 80;

    // AbortController for cleaning up zoom event listeners
    let zoomAbortController = null;

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

    /* ======== SWIPE NAVIGATION ======== */
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

    /* ======== IMAGE ZOOM (PINCH, DRAG, DOUBLE-TAP) ======== */
    const activateImageZoom = () => {
        // Clean up previous listeners
        if (zoomAbortController) {
            zoomAbortController.abort();
        }
        zoomAbortController = new AbortController();
        const signal = zoomAbortController.signal;

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

            // Mouse events
            stage.addEventListener("dblclick", (e) => { e.preventDefault(); adjustZoom(scale === 1 ? 2.2 : 1); }, { signal });
            stage.addEventListener("wheel", (e) => {
                e.preventDefault();
                const r = stage.getBoundingClientRect();
                adjustZoom(scale + (e.deltaY < 0 ? 0.25 : -0.25), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
            }, { passive: false, signal });

            stage.addEventListener("mousedown", (e) => { if (scale > 1) { e.preventDefault(); setDrag(true, e); } }, { signal });
            window.addEventListener("mousemove", (e) => handleMove(e.clientX, e.clientY), { signal });
            window.addEventListener("mouseup", () => setDrag(false), { signal });
            stage.addEventListener("mouseleave", () => setDrag(false), { signal });

            // Touch events
            stage.addEventListener("touchstart", (e) => {
                if (e.touches.length === 1) {
                    const now = Date.now();
                    if (now - lastTap < 300) { e.preventDefault(); e.stopPropagation(); adjustZoom(scale === 1 ? 2.2 : 1); lastTap = 0; }
                    else { lastTap = now; if (scale > 1) { e.preventDefault(); e.stopPropagation(); setDrag(true, e); } }
                } else if (e.touches.length === 2) {
                    e.preventDefault(); e.stopPropagation(); initialDist = getDist(e.touches); initialScale = scale; setDrag(false);
                }
            }, { passive: false, signal });

            stage.addEventListener("touchmove", (e) => {
                if (e.touches.length === 2 && initialDist) {
                    e.preventDefault(); e.stopPropagation(); adjustZoom(initialScale * (getDist(e.touches) / initialDist));
                } else if (e.touches.length === 1) {
                    if (activeDrag && scale > 1) { e.preventDefault(); e.stopPropagation(); }
                    handleMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: false, signal });

            ["touchend", "touchcancel"].forEach(evt => stage.addEventListener(evt, (e) => {
                initialDist = 0;
                if (scale > 1) { e.preventDefault(); e.stopPropagation(); }
                if (scale <= 1) { pointX = pointY = 0; }
                setDrag(false);
                updateTransform();
            }, { passive: false, signal }));

            img.addEventListener("load", () => adjustZoom(1), { signal });
            img.addEventListener("dragstart", (e) => e.preventDefault(), { signal });
        });
    };

    /* ======== MODAL OPEN — BUILD SLIDES ======== */
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

    /* ======== MODAL CLOSE — CLEANUP ======== */
    const zoomModal = document.getElementById("zoomModal");
    if (zoomModal) {
        const zoomModalInstance = bootstrap.Modal.getOrCreateInstance(zoomModal);
        let zoomHistoryActive = false;
        let closingFromHistory = false;

        zoomModal.addEventListener("shown.bs.modal", () => {
            if (zoomHistoryActive) {
                return;
            }

            history.pushState({ ...history.state, zoomModalOpen: true }, "", window.location.href);
            zoomHistoryActive = true;
        });

        window.addEventListener("popstate", () => {
            if (!zoomHistoryActive) {
                return;
            }

            zoomHistoryActive = false;
            closingFromHistory = true;

            if (zoomModal.classList.contains("show")) {
                zoomModalInstance.hide();
            }
        });

        zoomModal.addEventListener("hidden.bs.modal", () => {
            // Abort all zoom-related listeners
            if (zoomAbortController) {
                zoomAbortController.abort();
                zoomAbortController = null;
            }

            // Clear carousel content
            carouselInner.innerHTML = "";

            // Dispose carousel instance
            if (carouselInstance) {
                carouselInstance.dispose();
                carouselInstance = null;
            }

            if (zoomHistoryActive && !closingFromHistory) {
                zoomHistoryActive = false;
                history.back();
            }

            closingFromHistory = false;
        });
    }
});
