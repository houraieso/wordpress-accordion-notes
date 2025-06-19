jQuery(document).ready(function($) {
    'use strict';
    if (!$('.accordion-notes-admin').length) return;

    // accordionStylesが未定義の場合のフォールバック
    let accordionStyles = window.accordionStyles || {
        title_bg_color: '#97baa0',
        title_text_color: '#ffffff',
        content_bg_color: '#fdfdfd',
        content_text_color: '#566270',
        subtitle_text_color: '#566270',
        border_radius: 8,
        margin: 10,
        animation: 'slide'
    };
    let itemIdCounter = Date.now();

    function init() {
        initializeColorPickers();
        loadInitialData();
        setupEventListeners();
        updateAllSliders();
        updatePreview(); // 初回プレビュー更新
        // トップレベルコンテナにSortableを適用
        $('#accordion-structure').sortable(getSortableOptions());
    }

    // Sortableのオプションを返す共通関数
    function getSortableOptions() {
        return {
            handle: '.drag-handle',
            placeholder: 'accordion-placeholder',
            connectWith: '.accordion-structure, .accordion-children',
            tolerance: 'pointer',
            revert: 250,
            forcePlaceholderSize: true,
            start: function(event, ui) {
                ui.placeholder.height(ui.item.height());
            }
        };
    }

    // ★★★ 変更点 ★★★ カラーピッカーの不具合を修正した新しい初期化関数
    function initializeColorPickers() {
        $('.color-picker').each(function() {
            $(this).wpColorPicker({
                change: (event, ui) => {
                    accordionStyles[$(event.target).data('style')] = ui.color.toString();
                    updatePreview();
                },
                // clear: ... （必要なら追加）
            });
        });

        // いずれかのカラーピッカーを開こうとした時（フォーカスが当たった時）
        // 他のピッカーが既に開いていれば閉じる
        $(document).on('click', '.wp-color-result', function() {
            const $currentPickerContainer = $(this).closest('.wp-picker-container');

            // 他の全てのピッカーコンテナを検索
            $('.wp-picker-container').not($currentPickerContainer).each(function() {
                // iris（カラーピッカー本体）が開いているかチェック
                if ($(this).find('.wp-picker-holder:visible').length) {
                    // 開いていれば、そのピッカーを閉じる
                    $(this).find('.color-picker').wpColorPicker('close');
                }
            });
        });
    }

    function loadInitialData() {
        if (window.accordionData && window.accordionData.length > 0) {
            renderStructure(window.accordionData, $('#accordion-structure'));
        }
    }

    function setupEventListeners() {
        const doc = $(document);
        doc.on('click', '#add-accordion-item', handleAddItem);
        doc.on('click', '.toggle-editor', handleToggleEditor);
        doc.on('click', '.add-child', handleAddChild);
        doc.on('click', '.accordion-delete', handleDeleteItem);
        doc.on('click', '.insert-subtitle, .toggle-bold, .toggle-italic', handleInsertTag);
        doc.on('click', '.insert-image', handleInsertImage);
        doc.on('input', '.style-slider', handleSliderChange);
        doc.on('input', '.slider-input', handleNumberInputChange);
        doc.on('change', 'select[data-style="animation"]', handleSelectChange);
        doc.on('click', '#copy-shortcode', handleCopyShortcode);
        $('#save-accordion').on('click', handleSave);
    }

    function handleAddItem() {
        const $newItem = $(createItemHtml());
        $('#accordion-structure').append($newItem);
        // 新しく追加したアイテムの子コンテナにもSortableを適用
        $newItem.find('.accordion-children').sortable(getSortableOptions());
    }

    function handleToggleEditor(e) {
        e.preventDefault();
        const $button = $(this);
        $button.toggleClass('is-open');
        $button.closest('.accordion-item-editor').find('.accordion-content-editor').slideToggle(300);
    }

    function handleAddChild(e) {
        e.preventDefault();
        const $childrenContainer = $(this).closest('.accordion-item-editor').find('> .accordion-children');
        const $newItem = $(createItemHtml());
        $childrenContainer.append($newItem);
        // 新しく追加したアイテムの子コンテナにもSortableを適用
        $newItem.find('.accordion-children').sortable(getSortableOptions());
    }

    function handleDeleteItem(e) {
        e.preventDefault();
        if (confirm('この項目と、含まれる子項目をすべて削除します。よろしいですか？')) {
            $(this).closest('.accordion-item-editor').fadeOut(300, function() {
                $(this).remove();
            });
        }
    }

    function handleInsertTag(e) {
        e.preventDefault();
        const $button = $(this),
            $textarea = $button.closest('.accordion-content-editor').find('textarea');
        let tag = '';
        if ($button.hasClass('insert-subtitle')) tag = '<h4>小タイトル</h4>\n';
        if ($button.hasClass('toggle-bold')) tag = '<strong>太字テキスト</strong>';
        if ($button.hasClass('toggle-italic')) tag = '<em>斜体テキスト</em>';
        if (tag) insertAtCursor($textarea[0], tag);
    }

    function handleInsertImage(e) {
        e.preventDefault();
        const $textarea = $(this).closest('.accordion-content-editor').find('textarea');
        const mediaUploader = wp.media({
            title: '画像を選択',
            button: {
                text: '画像を挿入'
            },
            multiple: false
        });
        mediaUploader.on('select', () => {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            insertAtCursor($textarea[0], `<img src="${attachment.url}" alt="${attachment.alt}" />`);
        });
        mediaUploader.open();
    }

    function handleSliderChange() {
        const $slider = $(this),
            style = $slider.data('style'),
            value = $slider.val();
        accordionStyles[style] = value;
        $slider.siblings('.slider-input').val(value);
        updateSliderTrack($slider);
        updatePreview();
    }

    function handleNumberInputChange() {
        const $input = $(this),
            style = $input.data('style'),
            value = $input.val();
        accordionStyles[style] = value;
        const $slider = $input.siblings('.style-slider');
        $slider.val(value);
        updateSliderTrack($slider);
        updatePreview();
    }

    function handleSelectChange() {
        accordionStyles[$(this).data('style')] = $(this).val();
        updatePreview();
    }

    function handleCopyShortcode() {
        const $button = $(this),
            $input = $('#shortcode-text');
        if (!$input.val()) return;
        navigator.clipboard.writeText($input.val()).then(() => {
            const originalText = $button.text();
            $button.text('コピー完了').addClass('is-copied');
            setTimeout(() => $button.text(originalText).removeClass('is-copied'), 2000);
        });
    }

    function handleSave() {
        const name = $('#accordion_name').val().trim();
        if (!name) {
            showToastNotification('アコーディオンセットの名前を入力してください。', true);
            return;
        }
        const data = serializeStructure($('#accordion-structure'));
        if (data.length === 0) {
            showToastNotification('アコーディオン項目を1つ以上追加してください。', true);
            return;
        }

        $('#save-accordion').text('保存中...').prop('disabled', true);
        $.post(accordion_ajax.ajax_url, {
            action: 'save_accordion',
            nonce: accordion_ajax.nonce,
            id: window.editId || 0,
            name: name,
            data: JSON.stringify(data),
            styles: JSON.stringify(accordionStyles)
        }).done(res => {
            if (res.success) {
                if (!window.editId) {
                    window.location.href = `admin.php?page=accordion-notes-new&edit=${res.data.id}&created=true`;
                } else {
                    showToastNotification(res.data.message || '保存しました。');
                }
                 // 新規保存成功時にIDをセットしてショートコードを表示させる
                 if (res.data.id && !window.editId) {
                    window.editId = res.data.id;
                    const shortcodeHtml = `<input type="text" readonly id="shortcode-text" value='[accordion id="${res.data.id}"]'><button type="button" class="button" id="copy-shortcode">コピー</button>`;
                    $('#shortcode-area').html(shortcodeHtml);
                }
            } else {
                showToastNotification('保存失敗: ' + (res.data || '不明なエラー'), true);
            }
        }).fail(() => showToastNotification('サーバーとの通信に失敗しました。', true))
          .always(() => $('#save-accordion').text('保存').prop('disabled', false));
    }

    function createItemHtml(item = {}) {
        const title = item.title || '';
        const content = item.content || '';
        const uniqueId = 'item_' + (item.id || itemIdCounter++);
        return `
            <div class="accordion-item-editor" data-id="${uniqueId}">
                <div class="accordion-item-header">
                    <span class="drag-handle">≡</span>
                    <input type="text" class="accordion-title-input" placeholder="アコーディオンタイトル" value="${escapeHtml(title)}">
                    <div class="accordion-item-controls">
                        <button type="button" class="button toggle-editor">▼</button>
                        <button type="button" class="button add-child">+</button>
                        <button type="button" class="button accordion-delete">×</button>
                    </div>
                </div>
                <div class="accordion-content-editor" style="display: none;">
                    <div class="content-toolbar">
                        <button type="button" class="button insert-subtitle">H</button>
                        <button type="button" class="button toggle-bold">B</button>
                        <button type="button" class="button toggle-italic">I</button>
                        <button type="button" class="button insert-image">画像挿入</button>
                    </div>
                    <textarea class="accordion-content-input" placeholder="アコーディオンの中身テキスト">${escapeHtml(content)}</textarea>
                </div>
                <div class="accordion-children"></div>
            </div>`;
    }

    function renderStructure(items, $container) {
        items.forEach(item => {
            const $itemEl = $(createItemHtml(item));
            $container.append($itemEl);
            const $childrenContainer = $itemEl.find('.accordion-children');

            if (item.children && item.children.length > 0) {
                renderStructure(item.children, $childrenContainer);
            }
            // 子コンテナにSortableを適用
            $childrenContainer.sortable(getSortableOptions());
        });
    }

    function serializeStructure($container) {
        return $container.children('.accordion-item-editor').map(function() {
            const $item = $(this);
            const title = $item.find('.accordion-title-input').first().val().trim();
            // タイトルが空の場合は無視
            if (!title) return null;

            return {
                title: title,
                content: $item.find('.accordion-content-input').first().val(),
                children: serializeStructure($item.find('.accordion-children').first())
            };
        }).get();
    }

    function updatePreview() {
        const s = accordionStyles;
        const $preview = $('#accordion-preview');

        // CSS変数を更新して動的なスタイルを適用
        $preview.css({
            '--preview-title-bg': s.title_bg_color,
            '--preview-title-text': s.title_text_color,
            '--preview-content-bg': s.content_bg_color,
            '--preview-content-text': s.content_text_color,
            '--preview-subtitle-text': s.subtitle_text_color,
            '--preview-border-radius': `${s.border_radius}px`,
            '--preview-border-color': s.title_bg_color,
            '--preview-margin': `${s.margin}px`
        });

        // プレビューのHTMLがまだなければ生成
        if ($preview.find('.accordion-item').length === 0) {
            const previewHtml = `
                <div class="accordion-item is-open">
                    <div class="accordion-item-title">
                        <span>サンプルタイトル</span>
                        <span class="accordion-toggle"></span>
                    </div>
                    <div class="accordion-item-content" style="display: block;">
                        <h4>サンプル小タイトル</h4>
                        <p>このプレビューはスタイル設定を反映します。</p>
                        <div class="accordion-children">
                             <div class="accordion-item">
                                <div class="accordion-item-title">
                                    <span>子アコーディオン</span>
                                    <span class="accordion-toggle"></span>
                                </div>
                                <div class="accordion-item-content" style="display: none;">
                                    <p>子アコーディオンの本文です。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="accordion-item">
                     <div class="accordion-item-title">
                        <span>閉じたサンプル</span>
                        <span class="accordion-toggle"></span>
                    </div>
                    <div class="accordion-item-content" style="display: none;">
                        <p>これは閉じたアコーディオンの本文です。</p>
                    </div>
                </div>`;
            $preview.html(previewHtml);

            // クリックイベントを一度だけ設定
            $preview.off('click', '.accordion-item-title').on('click', '.accordion-item-title', function(e) {
                e.stopPropagation();
                const $title = $(this);
                const $item = $title.closest('.accordion-item');
                const $content = $item.find('> .accordion-item-content');
                const animation = accordionStyles.animation || 'slide';

                $item.toggleClass('is-open');

                if (animation === 'fade') {
                    $content.fadeToggle(300);
                } else if (animation === 'slide') {
                    $content.slideToggle(300);
                } else {
                    $content.toggle();
                }
            });
        }
    }

    function updateSliderTrack($slider) {
        const val = parseFloat($slider.val()),
            min = parseFloat($slider.attr('min')) || 0,
            max = parseFloat($slider.attr('max')) || 100;
        const percent = (val - min) / (max - min) * 100;
        $slider.css('background', `linear-gradient(to right, var(--primary-light-color) ${percent}%, var(--border-color) ${percent}%)`);
    }

    function updateAllSliders() {
        $('.style-slider').each((i, el) => updateSliderTrack($(el)));
    }

    function insertAtCursor(el, text) {
        const start = el.selectionStart;
        el.value = el.value.substring(0, start) + text + el.value.substring(el.selectionEnd);
        el.selectionStart = el.selectionEnd = start + text.length;
        $(el).trigger('input').focus();
    }

    function escapeHtml(text) {
        if (text === null || typeof text === 'undefined') return '';
        return $('<div>').text(text).html();
    }

    // トースト通知を表示する関数
    function showToastNotification(message, isError = false) {
        const $toast = $('#an-toast-notification');
        if (!$toast.length) return;

        $toast.text(message).removeClass('is-error');
        if (isError) {
            $toast.addClass('is-error');
        }

        $toast.addClass('is-visible');

        setTimeout(() => {
            $toast.removeClass('is-visible');
        }, 3000); // 3秒後に非表示
    }

    init();
});
