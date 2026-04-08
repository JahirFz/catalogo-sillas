document.addEventListener("DOMContentLoaded", () => {
    const zoomCarousel = document.getElementById("zoomCarousel");
    const carouselInner = document.getElementById("carouselImages");
    const productCards = document.querySelectorAll(".product-card");

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

    document.querySelectorAll(".zoom-click").forEach((image) => {
        image.addEventListener("click", () => {
            const imageList = image.dataset.images
                ? image.dataset.images.split(",").map((item) => item.trim()).filter(Boolean)
                : [image.getAttribute("src")];

            const slidesMarkup = imageList.map((src, index) => `
                <div class="carousel-item ${index === 0 ? "active" : ""}">
                    <img src="${src}" class="d-block w-100 img-fluid zoom-slide" alt="${image.alt || "Imagen del producto"}">
                </div>
            `).join("");

            carouselInner.innerHTML = slidesMarkup;

            if (carouselInstance) {
                carouselInstance.dispose();
            }

            carouselInstance = new bootstrap.Carousel(zoomCarousel, {
                interval: false,
                touch: true,
                wrap: true
            });
        });
    });
});
