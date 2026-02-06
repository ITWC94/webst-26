(function() {
    'use strict';

    var dl = window.dataLayer = window.dataLayer || [];

    // =========================================================================
    // 1. CTA CLICK TRACKING
    // Tracks all CTA button clicks with context (text, location, destination)
    // =========================================================================
    var ctaSelectors = [
        '.btn-gitouch',
        '.btn-primary',
        '.btn-secondary',
        '.btn-submit',
        '.btn-linkedin',
        '.btn-nav-cta',
        '.cookie-settings-btn'
    ].join(',');

    document.addEventListener('click', function(e) {
        var cta = e.target.closest(ctaSelectors);
        if (!cta) return;

        var section = cta.closest('section') || cta.closest('nav') || cta.closest('header');
        var sectionId = section ? (section.id || section.className.split(' ')[0]) : 'unknown';

        dl.push({
            'event': 'cta_click',
            'cta_text': (cta.textContent || '').trim().substring(0, 80),
            'cta_class': cta.className,
            'cta_url': cta.href || cta.getAttribute('data-url') || '',
            'cta_section': sectionId
        });
    });

    // =========================================================================
    // 2. SCROLL DEPTH TRACKING
    // Fires at 25%, 50%, 75%, 100% milestones (once each per page)
    // =========================================================================
    var scrollMarks = { 25: false, 50: false, 75: false, 100: false };
    var scrollTimer = null;

    window.addEventListener('scroll', function() {
        if (scrollTimer) return;
        scrollTimer = setTimeout(function() {
            scrollTimer = null;
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var docHeight = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight
            ) - window.innerHeight;
            if (docHeight <= 0) return;

            var pct = Math.round((scrollTop / docHeight) * 100);
            var thresholds = [25, 50, 75, 100];
            for (var i = 0; i < thresholds.length; i++) {
                if (pct >= thresholds[i] && !scrollMarks[thresholds[i]]) {
                    scrollMarks[thresholds[i]] = true;
                    dl.push({
                        'event': 'scroll_depth',
                        'scroll_threshold': thresholds[i]
                    });
                }
            }
        }, 200);
    });

    // =========================================================================
    // 3. FAQ ACCORDION TRACKING
    // Tracks which FAQ questions users open
    // =========================================================================
    document.addEventListener('click', function(e) {
        var faqQuestion = e.target.closest('.faq-question');
        if (!faqQuestion) return;

        var questionText = faqQuestion.querySelector('h4');
        dl.push({
            'event': 'faq_click',
            'faq_question': questionText ? questionText.textContent.trim().substring(0, 120) : 'unknown'
        });
    });

    // =========================================================================
    // 4. FOOTER LINK TRACKING
    // Tracks navigation clicks from the footer
    // =========================================================================
    document.addEventListener('click', function(e) {
        var link = e.target.closest('a');
        if (!link) return;
        var footer = link.closest('footer') || link.closest('#footer-placeholder');
        if (!footer) return;

        dl.push({
            'event': 'footer_click',
            'footer_link_text': (link.textContent || '').trim().substring(0, 60),
            'footer_link_url': link.href || ''
        });
    });

    // =========================================================================
    // 5. OUTBOUND LINK TRACKING
    // Tracks clicks to external websites
    // =========================================================================
    document.addEventListener('click', function(e) {
        var link = e.target.closest('a[href]');
        if (!link) return;

        var href = link.href || '';
        if (!href.startsWith('http')) return;

        try {
            var linkHost = new URL(href).hostname;
            if (linkHost === window.location.hostname) return;
            if (linkHost === 'www.googletagmanager.com') return;

            dl.push({
                'event': 'outbound_click',
                'outbound_url': href,
                'outbound_domain': linkHost,
                'outbound_text': (link.textContent || '').trim().substring(0, 60)
            });
        } catch (err) { /* skip malformed URLs */ }
    });

    // =========================================================================
    // 6. DARK/LIGHT THEME TRACKING
    // Tracks theme preference on page load
    // =========================================================================
    dl.push({
        'event': 'theme_preference',
        'theme': document.body.classList.contains('light-theme') ? 'light' : 'dark'
    });

    // =========================================================================
    // 7. SERVICE PAGE ENGAGEMENT
    // Tracks time spent on service pages (30s, 60s, 120s, 300s milestones)
    // =========================================================================
    var pageType = null;
    for (var i = 0; i < dl.length; i++) {
        if (dl[i] && dl[i].page_type) { pageType = dl[i].page_type; break; }
    }

    if (pageType === 'service' || pageType === 'contact' || pageType === 'about') {
        var engagementMarks = [30, 60, 120, 300];
        var engagementFired = {};

        setInterval(function() {
            if (document.hidden) return;
            for (var j = 0; j < engagementMarks.length; j++) {
                var mark = engagementMarks[j];
                if (engagementFired[mark]) continue;
                engagementFired[mark] = true;
                dl.push({
                    'event': 'page_engagement',
                    'engagement_seconds': mark
                });
                engagementMarks.splice(j, 1);
                break;
            }
        }, 1000 * (engagementMarks[0] || 30));

        // More precise timer
        var secondsOnPage = 0;
        setInterval(function() {
            if (!document.hidden) secondsOnPage++;
            for (var j = 0; j < engagementMarks.length; j++) {
                if (secondsOnPage >= engagementMarks[j] && !engagementFired[engagementMarks[j]]) {
                    engagementFired[engagementMarks[j]] = true;
                    dl.push({
                        'event': 'page_engagement',
                        'engagement_seconds': engagementMarks[j]
                    });
                }
            }
        }, 1000);
    }

    // =========================================================================
    // 8. 404 ERROR TRACKING
    // Captures the broken URL and referrer on error pages
    // =========================================================================
    if (pageType === 'error') {
        dl.push({
            'event': '404_error',
            'error_url': window.location.href,
            'error_referrer': document.referrer || 'direct',
            'error_path': window.location.pathname
        });
    }

    // =========================================================================
    // 9. CORE WEB VITALS
    // Tracks LCP, CLS, FID using PerformanceObserver
    // =========================================================================
    if (typeof PerformanceObserver !== 'undefined') {
        // Largest Contentful Paint
        try {
            new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                var lastEntry = entries[entries.length - 1];
                dl.push({
                    'event': 'web_vital',
                    'vital_name': 'LCP',
                    'vital_value': Math.round(lastEntry.startTime)
                });
            }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        // First Input Delay
        try {
            new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                if (entries.length > 0) {
                    dl.push({
                        'event': 'web_vital',
                        'vital_name': 'FID',
                        'vital_value': Math.round(entries[0].processingStart - entries[0].startTime)
                    });
                }
            }).observe({ type: 'first-input', buffered: true });
        } catch (e) {}

        // Cumulative Layout Shift
        try {
            var clsValue = 0;
            new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                for (var k = 0; k < entries.length; k++) {
                    if (!entries[k].hadRecentInput) {
                        clsValue += entries[k].value;
                    }
                }
            }).observe({ type: 'layout-shift', buffered: true });

            // Report CLS when user leaves the page
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'hidden') {
                    dl.push({
                        'event': 'web_vital',
                        'vital_name': 'CLS',
                        'vital_value': Math.round(clsValue * 1000) / 1000
                    });
                }
            });
        } catch (e) {}
    }

    // =========================================================================
    // 10. CONVERSION FUNNEL TRACKING
    // Tracks: page_view → cta_visible → form_start → form_submit
    // =========================================================================
    // Track when CTA sections become visible (IntersectionObserver)
    if (typeof IntersectionObserver !== 'undefined') {
        var ctaSections = document.querySelectorAll(
            '.service-cta-section, .about-cta-section, #contact-form-section, #book-call'
        );
        if (ctaSections.length > 0) {
            var ctaObserver = new IntersectionObserver(function(entries) {
                for (var m = 0; m < entries.length; m++) {
                    if (entries[m].isIntersecting) {
                        var el = entries[m].target;
                        dl.push({
                            'event': 'cta_visible',
                            'cta_section_id': el.id || el.className.split(' ')[0]
                        });
                        ctaObserver.unobserve(el);
                    }
                }
            }, { threshold: 0.5 });

            for (var n = 0; n < ctaSections.length; n++) {
                ctaObserver.observe(ctaSections[n]);
            }
        }
    }

    // Track form field focus (form_start - fires once)
    var formStarted = false;
    document.addEventListener('focusin', function(e) {
        if (formStarted) return;
        var form = e.target.closest('#contactForm');
        if (!form) return;
        formStarted = true;
        dl.push({
            'event': 'form_start',
            'form_id': 'contactForm'
        });
    });

    // =========================================================================
    // 11. CROSS-DOMAIN: BLOG LINK DECORATION
    // Adds client_id param to blog links for cross-domain tracking
    // =========================================================================
    var blogLinks = document.querySelectorAll('a[href*="insights.yalin.consulting"]');
    if (blogLinks.length > 0) {
        for (var p = 0; p < blogLinks.length; p++) {
            blogLinks[p].addEventListener('click', function() {
                dl.push({
                    'event': 'blog_navigation',
                    'blog_link_text': (this.textContent || '').trim().substring(0, 60),
                    'blog_source_page': window.location.pathname
                });
            });
        }
    }

})();
