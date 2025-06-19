jQuery(document).ready(function($) {
    'use strict';

    /**
     * 全てのアコーディオンを初期化
     */
    function initAccordions() {
        $('.accordion-notes-container').each(function() {
            if ($(this).data('accordion-initialized')) return;
            setupAccordionEvents($(this));
            $(this).data('accordion-initialized', true);
        });
    }

    /**
     * アコーディオンコンテナにイベントを設定
     * @param {jQuery} $container アコーディオンコンテナ要素
     */
    function setupAccordionEvents($container) {
        const animation = $container.data('animation') || 'slide';
        $container.off('click', '.accordion-item-title').on('click', '.accordion-item-title', function(e) {
            e.stopPropagation();
            e.preventDefault();
            toggleAccordionItem($(this), animation);
        });
        $container.find('.accordion-item-title').attr('tabindex', '0').off('keydown').on('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleAccordionItem($(this), animation);
            }
        });
    }

    /**
     * アコーディオン項目の開閉を切り替え
     * @param {jQuery} $title クリックされたタイトル要素
     * @param {string} animation アニメーション種別 ('slide', 'fade', 'none')
     */
    function toggleAccordionItem($title, animation) {
        const $item = $title.closest('.accordion-item');
        const $content = $item.find('> .accordion-item-content');

        if ($content.data('animating') === true) return;

        // ★★★変更点★★★
        // アニメーション分岐の前にラッパーを作成することで、全方式でデザインを統一
        if ($content.children('.accordion-content-inner').length === 0) {
            $content.wrapInner('<div class="accordion-content-inner"></div>');
        }

        const isCurrentlyOpen = $item.hasClass('is-open');
        const isVisible = $content.is(':visible');
        if (isCurrentlyOpen !== isVisible) {
            isCurrentlyOpen ? $content.show() : $content.hide();
        }

        $content.data('animating', true).attr('data-animating', 'true');
        $item.toggleClass('is-open');
        const willBeOpen = $item.hasClass('is-open');

        if (animation === 'fade') {
            handleFadeAnimation($content, willBeOpen);
        } else if (animation === 'slide') {
            handleSlideAnimation($content, willBeOpen);
        } else {
            handleNoAnimation($content, willBeOpen);
        }
    }

    /**
     * アニメーションなしの処理（ラッパー対応版）
     * @param {jQuery} $content コンテンツ要素
     * @param {boolean} willBeOpen 開く予定かどうか
     */
    function handleNoAnimation($content, willBeOpen) {
        if (willBeOpen) {
            $content.show().css('height', 'auto');
        } else {
            $content.hide();
        }
        cleanupAnimation($content);
    }

    /**
     * フェードアニメーション処理（ラッパー対応版）
     * @param {jQuery} $content コンテンツ要素
     * @param {boolean} willBeOpen 開く予定かどうか
     */
    function handleFadeAnimation($content, willBeOpen) {
        $content.stop(true, true).clearQueue();
        if (willBeOpen) {
            $content.css({
                'display': 'block',
                'opacity': 0
            }).animate({
                'opacity': 1
            }, {
                duration: 250,
                easing: 'swing',
                queue: false,
                complete: function() {
                    $(this).css('height', 'auto');
                    cleanupAnimation($content);
                }
            });
        } else {
            $content.animate({
                'opacity': 0
            }, {
                duration: 250,
                easing: 'swing',
                queue: false,
                complete: function() {
                    $(this).css('display', 'none');
                    cleanupAnimation($content);
                }
            });
        }
    }

    /**
     * スライドアニメーション処理（ラッパー対応版）
     * @param {jQuery} $content コンテンツ要素
     * @param {boolean} willBeOpen 開く予定かどうか
     */
    function handleSlideAnimation($content, willBeOpen) {
        $content.stop(true, true).clearQueue();
        const $inner = $content.find('.accordion-content-inner');
        if (willBeOpen) {
            $content.css({ 'display': 'block', 'overflow': 'hidden' });
            const targetHeight = $inner.outerHeight(true);
            $content.css('height', '0px').animate({
                'height': targetHeight
            }, {
                duration: 400,
                easing: 'swing',
                queue: false,
                complete: function() {
                    $(this).css({ 'height': 'auto', 'overflow': 'visible' });
                    cleanupAnimation($content);
                }
            });
        } else {
            $content.css({ 'height': $content.height(), 'overflow': 'hidden' }).animate({
                'height': '0px'
            }, {
                duration: 400,
                easing: 'swing',
                queue: false,
                complete: function() {
                    $(this).css('display', 'none');
                    cleanupAnimation($content);
                }
            });
        }
    }

    /**
     * アニメーション完了後のクリーンアップ
     * @param {jQuery} $content コンテンツ要素
     */
    function cleanupAnimation($content) {
        $content.removeData('animating').removeAttr('data-animating');
        requestAnimationFrame(function() {
            $content.css({ 'transform': 'translateZ(0)', 'will-change': 'auto' });
        });
    }

    // パフォーマンス検出やその他の最適化関数は変更なし...
    // (以下、元のファイルのまま)

    /**
     * デバイスの性能を検出してアニメーション設定を調整
     */
    function detectPerformanceAndAdjust() {
        const isLowPerformance = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.navigator.hardwareConcurrency && window.navigator.hardwareConcurrency < 4) || window.devicePixelRatio > 2);
        if (isLowPerformance) {
            $.fx.speeds._default = 200;
            const style = document.createElement('style');
            style.textContent = `.accordion-toggle { transition-duration: 0.2s !important; } .accordion-item-title { transition-duration: 0.15s !important; }`;
            document.head.appendChild(style);
        }
    }

    /**
     * プリロード最適化
     */
    function optimizePreload() {
        $('.accordion-item-content').css('transform', 'translateZ(0)');
        $('.accordion-item-content img').each(function() {
            const $img = $(this);
            if ($img.attr('data-src') && !$img.attr('src')) {
                $img.attr('src', $img.attr('data-src'));
            }
        });
    }

    /**
     * Intersection Observer による最適化
     */
    function setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const $container = $(entry.target);
                        if (!$container.data('accordion-initialized')) {
                            setupAccordionEvents($container);
                            $container.data('accordion-initialized', true);
                        }
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '50px' });
            $('.accordion-notes-container').each(function() { observer.observe(this); });
        } else {
            initAccordions();
        }
    }

    detectPerformanceAndAdjust();

    if ($('.accordion-notes-container').length > 0) {
        if ('IntersectionObserver' in window && $('.accordion-notes-container').length > 3) {
            setupIntersectionObserver();
        } else {
            initAccordions();
        }
    }

    $(document).ajaxComplete(function() { initAccordions(); });
    $(window).on('load', function() { optimizePreload(); });

    let resizeTimer;
    $(window).on('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            $('.accordion-item.is-open .accordion-item-content:visible').each(function() {
                const $content = $(this);
                if (!$content.data('animating')) {
                    $content.css('height', 'auto');
                }
            });
        }, 150);
    });

    $(document).on('turbo:load pjax:end', function() { initAccordions(); });

    window.accordionForceCleanup = function() {
        $('.accordion-item-content').each(function() {
            const $content = $(this);
            $content.stop(true, true).clearQueue();
            $content.removeData('animating').removeAttr('data-animating');
            $content.css({ 'height': 'auto', 'overflow': 'visible', 'opacity': '1', 'transform': 'translateZ(0)', 'will-change': 'auto' });
        });
    };
});
