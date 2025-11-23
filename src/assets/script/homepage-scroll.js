(function () {
    // Prevent multiple initializations
    if (window.homepageScrollInitialized) {
        return;
    }
    window.homepageScrollInitialized = true;

    function initScrollAnimation() {
        const fadeElements = document.querySelectorAll('.fade-in');

        if (fadeElements.length === 0) {
            return;
        }

        // Create Intersection Observer
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
        };

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Unobserve after animation to improve performance
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all fade-in elements
        fadeElements.forEach(function (element) {
            observer.observe(element);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollAnimation);
    } else {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(initScrollAnimation, 0);
    }

    // Fallback initialization after a delay
    setTimeout(function () {
        const fadeElements = document.querySelectorAll('.fade-in');
        if (fadeElements.length > 0) {
            initScrollAnimation();
        }
    }, 200);
})();
