document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('reviews-track');
    const slides = document.querySelectorAll('.review-slide');
    const dots = document.querySelectorAll('.dot');
    const container = document.getElementById('reviews-container');
    const viewport = document.querySelector('.reviews-viewport');

    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    let slideInterval;
    let startX = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let isDragging = false;
    const totalSlides = slides.length;

    // --- HÀM CẬP NHẬT VỊ TRÍ SLIDE (LOGIC CĂN GIỮA CHUẨN) ---
    function updateSliderPosition() {
        if (slides.length === 0) return;

        const slideWidth = slides[0].offsetWidth;
        const viewportWidth = viewport.offsetWidth;

        // Tính toán vị trí trung tâm của viewport
        const centerViewport = viewportWidth / 2;

        // Tính toán vị trí trung tâm của slide active (khi nó ở vị trí 0)
        const centerSlide = slideWidth / 2;

        // Khoảng cách cần dịch chuyển để slide[0] nằm giữa:
        // initialOffset = centerViewport - centerSlide
        const initialOffset = centerViewport - centerSlide;

        // Vị trí cần dịch chuyển cho slide hiện tại:
        // translateX = initialOffset - (index * slideWidth)
        const translateX = initialOffset - currentIndex * slideWidth;

        currentTranslate = translateX;
        prevTranslate = translateX;
        track.style.transform = `translateX(${translateX}px)`;

        // Update Active Classes
        slides.forEach((slide, i) => {
            if (i === currentIndex) slide.classList.add('active');
            else slide.classList.remove('active');
        });

        dots.forEach((dot, i) => {
            if (i === currentIndex) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    }

    function goToSlide(index) {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        currentIndex = index;
        updateSliderPosition();
    }

    // --- AUTO PLAY ---
    function startAutoSlide() {
        stopAutoSlide();
        slideInterval = setInterval(() => {
            goToSlide(currentIndex + 1);
        }, 5000);
    }

    function stopAutoSlide() {
        clearInterval(slideInterval);
    }

    // --- EVENTS ---
    dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            goToSlide(index);
            startAutoSlide();
        });
    });

    // Swipe Logic
    track.addEventListener('touchstart', touchStart);
    track.addEventListener('touchmove', touchMove);
    track.addEventListener('touchend', touchEnd);

    track.addEventListener('mousedown', touchStart);
    track.addEventListener('mousemove', touchMove);
    track.addEventListener('mouseup', touchEnd);
    track.addEventListener('mouseleave', () => {
        if (isDragging) touchEnd();
    });

    function touchStart(e) {
        stopAutoSlide();
        isDragging = true;
        startX = getPositionX(e);
        track.style.cursor = 'grabbing';
        track.style.transition = 'none';
    }

    function touchMove(e) {
        if (!isDragging) return;
        const currentX = getPositionX(e);
        const diff = currentX - startX;
        track.style.transform = `translateX(${prevTranslate + diff}px)`;
    }

    function touchEnd() {
        isDragging = false;
        track.style.cursor = 'grab';
        track.style.transition =
            'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';

        // Tính lại vị trí sau khi thả chuột
        // Nếu kéo được một đoạn đáng kể thì chuyển slide
        // Logic đơn giản: reset về vị trí chuẩn của slide gần nhất
        // Tuy nhiên ở đây ta dùng logic đơn giản: Kéo -> Quay về Active hiện tại hoặc Next/Prev

        // Để đơn giản cho bản này, ta sẽ dùng updateSliderPosition để snap lại vị trí active
        // Nếu muốn swipe next/prev thật sự, cần tính diff

        updateSliderPosition();
        startAutoSlide();
    }

    function getPositionX(e) {
        return e.type.includes('mouse') ? e.pageX : e.changedTouches[0].clientX;
    }

    window.addEventListener('resize', updateSliderPosition);

    // Init
    // Đợi 1 chút để layout render xong width
    setTimeout(() => {
        goToSlide(0); // Bắt đầu từ slide đầu tiên (nhưng sẽ được căn giữa)
        // Hoặc muốn bắt đầu từ slide giữa: goToSlide(Math.floor(totalSlides / 2));
        startAutoSlide();
    }, 100);
});
