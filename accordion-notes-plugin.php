<?php
/**
 * Plugin Name: Accordion Notes for Novel
 * Description: 小説投稿サイト向けアコーディオン形式コンテンツ管理プラグイン
 * Version: 1.1 (修正版)
 * Author: hourai
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ACCORDION_NOTES_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ACCORDION_NOTES_VERSION', '2.1.0');

class AccordionNotesPlugin {

    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('wp_enqueue_scripts', array($this, 'frontend_enqueue_scripts'));
        add_shortcode('accordion', array($this, 'accordion_shortcode'));
        add_action('wp_ajax_save_accordion', array($this, 'save_accordion'));
        register_activation_hook(__FILE__, array($this, 'create_table'));
        // ★★★ 変更点 ★★★ 編集画面で正しいメニューをハイライトするためのアクションを追加
        add_action('admin_head', array($this, 'fix_admin_menu_highlight'));
        add_filter('admin_title', array($this, 'fix_admin_title'), 10, 2); // この行を追加
    }

    // ★★★ 変更点 ★★★ 編集画面で「アコーディオン一覧」をハイライトするための関数
    public function fix_admin_menu_highlight() {
        global $pagenow, $submenu_file, $parent_file;

        // 編集画面（admin.php?page=accordion-notes-new&edit=...）の場合
        if ($pagenow === 'admin.php' && isset($_GET['page']) && $_GET['page'] === 'accordion-notes-new' && isset($_GET['edit'])) {
            // サブメニューのハイライトを「アコーディオン一覧」に強制的に変更
            $submenu_file = 'accordion-notes';
            $parent_file = 'accordion-notes';
        }
    }

    // ★★★ 新規追加 ★★★ 編集画面でタブタイトルを「アコーディオン一覧」に変更する関数
    public function fix_admin_title($admin_title, $title) {
        global $pagenow;

        // 編集画面の場合、タイトルを「アコーディオン一覧」に変更
        if ($pagenow === 'admin.php' && isset($_GET['page']) && $_GET['page'] === 'accordion-notes-new' && isset($_GET['edit'])) {
            return 'アコーディオン一覧 ‹ ' . get_bloginfo('name') . ' — WordPress';
        }

        return $admin_title;
    }

    public function init() {}

    public function create_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'accordion_notes';
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            data longtext NOT NULL,
            styles longtext NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    public function add_admin_menu() {
        add_menu_page('Accordion Notes', 'Accordion Notes', 'manage_options', 'accordion-notes', array($this, 'admin_page'), 'dashicons-editor-ul', 30);
        add_submenu_page('accordion-notes', 'アコーディオン一覧', 'アコーディオン一覧', 'manage_options', 'accordion-notes', array($this, 'admin_page'));
        add_submenu_page('accordion-notes', '新規作成', '新規作成', 'manage_options', 'accordion-notes-new', array($this, 'admin_edit_page'));
    }

    public function admin_enqueue_scripts($hook) {
        if (strpos($hook, 'accordion-notes') === false) return;

        wp_enqueue_script('jquery-ui-sortable');
        wp_enqueue_script('wp-color-picker');
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_media();

        wp_enqueue_script('accordion-notes-admin-js', ACCORDION_NOTES_PLUGIN_URL . 'admin.js', array('jquery', 'jquery-ui-sortable', 'wp-color-picker'), ACCORDION_NOTES_VERSION, true);
        wp_enqueue_style('accordion-notes-admin-css', ACCORDION_NOTES_PLUGIN_URL . 'admin.css', array('wp-color-picker'), ACCORDION_NOTES_VERSION);
        wp_localize_script('accordion-notes-admin-js', 'accordion_ajax', array('ajax_url' => admin_url('admin-ajax.php'), 'nonce' => wp_create_nonce('accordion_nonce')));
    }

    public function admin_page() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'accordion_notes';

        if (isset($_POST['delete_id']) && isset($_POST['_wpnonce']) && wp_verify_nonce($_POST['_wpnonce'], 'delete_accordion_nonce_' . $_POST['delete_id'])) {
            $wpdb->delete($table_name, array('id' => intval($_POST['delete_id'])));
            echo '<div class="notice notice-success"><p>アコーディオンを削除しました。</p></div>';
        }

        $accordions = $wpdb->get_results("SELECT * FROM $table_name ORDER BY updated_at DESC");
        ?>
        <div class="wrap accordion-notes-admin">
            <h1>アコーディオン一覧</h1>
            <a href="<?php echo admin_url('admin.php?page=accordion-notes-new'); ?>" class="page-title-action">新規追加</a>
            <table class="wp-list-table widefat fixed striped">
                <thead><tr><th style="width:5%;">ID</th><th>名前</th><th>ショートコード</th><th style="width:15%;">更新日</th><th style="width:15%;">操作</th></tr></thead>
                <tbody>
                    <?php if (empty($accordions)): ?>
                        <tr><td colspan="5">アコーディオンセットはまだありません。</td></tr>
                    <?php else: foreach ($accordions as $accordion): ?>
                        <tr>
                            <td><?php echo $accordion->id; ?></td>
                            <td><a href="<?php echo admin_url('admin.php?page=accordion-notes-new&edit=' . $accordion->id); ?>"><?php echo esc_html($accordion->name); ?></a></td>
                            <td><code>[accordion id="<?php echo $accordion->id; ?>"]</code></td>
                            <td><?php echo $accordion->updated_at; ?></td>
                            <td>
                                <a href="<?php echo admin_url('admin.php?page=accordion-notes-new&edit=' . $accordion->id); ?>" class="button">編集</a>
                                <form method="post" style="display:inline;" onsubmit="return confirm('本当に削除しますか？');">
                                    <?php wp_nonce_field('delete_accordion_nonce_' . $accordion->id); ?>
                                    <input type="hidden" name="delete_id" value="<?php echo $accordion->id; ?>"><input type="submit" class="button button-delete" value="削除">
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public function admin_edit_page() {
        $edit_id = isset($_GET['edit']) ? intval($_GET['edit']) : 0;
        $accordion_data = $accordion_styles = array();
        $accordion_name = '';

        if ($edit_id) {
            global $wpdb;
            $table_name = $wpdb->prefix . 'accordion_notes';
            $accordion = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $edit_id));
            if ($accordion) {
                $accordion_name = $accordion->name;
                $accordion_data = json_decode($accordion->data, true) ?: array();
                $accordion_styles = json_decode($accordion->styles, true) ?: array();
            }
        }

        $default_styles = array(
            'title_bg_color'      => '#566270', 'title_text_color'    => '#ffffff',
            'content_bg_color'    => '#eeeeed', 'content_text_color'  => '#566270',
            'subtitle_text_color' => '#566270', 'border_radius'       => 8,
            'margin'              => 10, 'animation'           => 'slide'
        );
        $accordion_styles = wp_parse_args($accordion_styles, $default_styles);
        ?>
        <div class="wrap accordion-notes-admin">
            <div id="an-toast-notification" class="an-toast"></div>
            <div class="page-header">
                <h1><?php echo $edit_id ? 'アコーディオンセット編集' : 'アコーディオンセット新規作成'; ?></h1>
                <div class="page-header-actions">
                    <a href="<?php echo admin_url('admin.php?page=accordion-notes'); ?>" class="button">一覧に戻る</a>
                    <button type="button" class="button button-primary" id="save-accordion">保存</button>
                </div>
            </div>
            <div class="accordion-editor">
                <div class="accordion-left-panel">
                    <div class="accordion-section">
                        <div class="form-group">
                            <label for="accordion_name">アコーディオンセットの名前</label>
                            <input type="text" id="accordion_name" value="<?php echo esc_attr($accordion_name); ?>" class="regular-text"/>
                        </div>
                    </div>
                    <div class="accordion-section">
                        <h3>アコーディオン構造</h3>
                        <div class="accordion-toolbar"><button type="button" class="button button-primary" id="add-accordion-item">アコーディオンを追加</button></div>
                        <div id="accordion-structure" class="accordion-structure"></div>
                    </div>
                </div>
                <div class="accordion-right-panel">
                    <div class="accordion-section">
                        <h3>スタイル設定</h3>
                        <div class="style-controls">
                            <?php
                            $color_settings = ['title_bg_color' => 'タイトル背景色', 'title_text_color' => 'タイトル文字色', 'content_bg_color' => '本文背景色', 'content_text_color' => '本文文字色', 'subtitle_text_color' => '小タイトル文字色'];
                            foreach($color_settings as $key => $label) {
                                echo '<div class="style-group"><label>'.$label.'</label><input type="text" class="color-picker" data-style="'.$key.'" value="'.esc_attr($accordion_styles[$key]).'"></div>';
                            }
                            $slider_settings = [
                                'border_radius' => ['label' => '角丸', 'min' => 0, 'max' => 30],
                                'margin' => ['label' => 'アコーディオン間の余白', 'min' => 0, 'max' => 30],
                            ];
                             foreach($slider_settings as $key => $s) {
                                echo '<div class="style-group slider-group"><label>'.$s['label'].'</label><div class="slider-wrapper"><input type="range" class="style-slider" data-style="'.$key.'" min="'.$s['min'].'" max="'.$s['max'].'" value="'.esc_attr($accordion_styles[$key]).'"><input type="number" class="slider-input" data-style="'.$key.'" min="'.$s['min'].'" max="'.$s['max'].'" value="'.esc_attr($accordion_styles[$key]).'"><span>px</span></div></div>';
                            }
                            ?>
                            <div class="style-group"><label>アニメーション</label><select data-style="animation"><?php
                                $options = ['slide' => 'スライド', 'fade' => 'フェード', 'none' => 'なし'];
                                foreach($options as $val => $label) { echo '<option value="'.$val.'" '.selected($accordion_styles['animation'], $val, false).'>'.$label.'</option>'; }
                            ?></select></div>
                        </div>
                    </div>
                    <div class="accordion-section"><h3>プレビュー</h3><div id="accordion-preview" class="accordion-preview"></div></div>
                    <div class="accordion-section">
                        <h3>ショートコード</h3>
                        <div id="shortcode-area" class="shortcode-display">
                            <?php if ($edit_id): ?>
                                <input type="text" readonly id="shortcode-text" value='[accordion id="<?php echo $edit_id; ?>"]'><button type="button" class="button" id="copy-shortcode">コピー</button>
                            <?php else: ?><em class="empty-shortcode">保存後に表示されます</em><?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <script type="text/javascript">
            var accordionData = <?php echo json_encode($accordion_data); ?>;
            var accordionStyles = <?php echo json_encode($accordion_styles); ?>;
            var editId = <?php echo $edit_id; ?>;
        </script>
        <?php
    }

    public function save_accordion() {
        check_ajax_referer('accordion_nonce', 'nonce');
        if (!current_user_can('manage_options')) wp_send_json_error('権限がありません', 403);
        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        $name = isset($_POST['name']) ? sanitize_text_field($_POST['name']) : '';
        $data = isset($_POST['data']) ? wp_unslash($_POST['data']) : '[]';
        $styles = isset($_POST['styles']) ? wp_unslash($_POST['styles']) : '{}';

        $decoded_data = json_decode($data);
        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error('データの形式が不正です。');
            return;
        }

        global $wpdb;
        $table_name = $wpdb->prefix . 'accordion_notes';
        $payload = array('name' => $name, 'data' => $data, 'styles' => $styles);

        if ($id > 0) {
            $result = $wpdb->update($table_name, $payload, array('id' => $id));
        } else {
            $result = $wpdb->insert($table_name, $payload);
            if($result) $id = $wpdb->insert_id;
        }

        if ($result !== false) {
            wp_send_json_success(array('id' => $id, 'message' => '保存しました。'));
        } else {
            wp_send_json_error('データベースへの保存に失敗しました。');
        }
    }

    /**
     * アコーディオンショートコード処理（改良版）
     * 管理画面プレビューと完全同期
     */
    public function accordion_shortcode($atts) {
        $atts = shortcode_atts(array('id' => 0), $atts, 'accordion');
        $id = intval($atts['id']);

        if (!$id) {
            return '';
        }

        global $wpdb;
        $accordion = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}accordion_notes WHERE id = %d",
            $id
        ));

        if (!$accordion) {
            return '';
        }

        $data = json_decode($accordion->data, true);
        $styles = json_decode($accordion->styles, true);

        if (empty($data) || json_last_error() !== JSON_ERROR_NONE) {
            return '';
        }

        // デフォルトスタイル設定
        $default_styles = array(
            'title_bg_color'      => '#eeeeed',
            'title_text_color'    => '#ffffff',
            'content_bg_color'    => '#eeeeed',
            'content_text_color'  => '#566270',
            'subtitle_text_color' => '#566270',
            'border_radius'       => 8,
            'margin'              => 10,
            'animation'           => 'slide'
        );
        $styles = wp_parse_args($styles, $default_styles);

        ob_start();
        ?>
        <div class="accordion-notes-container"
             id="accordion-notes-<?php echo esc_attr($id); ?>"
             data-animation="<?php echo esc_attr($styles['animation']); ?>"
             data-accordion-id="<?php echo esc_attr($id); ?>">
            <?php echo $this->render_accordion_items($data); ?>
        </div>
        <style>
            #accordion-notes-<?php echo esc_attr($id); ?> {
                --title-bg: <?php echo esc_attr($styles['title_bg_color']); ?>;
                --title-text: <?php echo esc_attr($styles['title_text_color']); ?>;
                --content-bg: <?php echo esc_attr($styles['content_bg_color']); ?>;
                --content-text: <?php echo esc_attr($styles['content_text_color']); ?>;
                --subtitle-text: <?php echo esc_attr($styles['subtitle_text_color']); ?>;
                --border-color: <?php echo esc_attr($styles['title_bg_color']); ?>;
                --border-radius: <?php echo esc_attr($styles['border_radius']); ?>px;
                --margin: <?php echo esc_attr($styles['margin']); ?>px;
            }
        </style>
        <?php
        return ob_get_clean();
    }

    /**
     * アコーディオン項目のレンダリング（改良版）
     * 管理画面プレビューと完全同期した出力
     */
    private function render_accordion_items($items) {
        $output = '';

        foreach ($items as $item) {
            // タイトルが空の場合はスキップ
            if (empty($item['title'])) {
                continue;
            }

            $title = esc_html($item['title']);
            $content = isset($item['content']) ? $item['content'] : '';

            // コンテンツの処理
            $processed_content = $this->process_accordion_content($content);

            $output .= '<div class="accordion-item">';
            $output .= '<div class="accordion-item-title" tabindex="0" role="button" aria-expanded="false">';
            $output .= '<span>' . $title . '</span>';
            $output .= '<span class="accordion-toggle"></span>';
            $output .= '</div>';
            $output .= '<div class="accordion-item-content" style="display: none;">';
            $output .= $processed_content;

            // 子要素がある場合は再帰的に処理
            if (!empty($item['children']) && is_array($item['children'])) {
                $output .= '<div class="accordion-children">';
                $output .= $this->render_accordion_items($item['children']);
                $output .= '</div>';
            }

            $output .= '</div>';
            $output .= '</div>';
        }

        return $output;
    }

    /**
     * アコーディオンコンテンツの処理
     * HTMLタグの適切な処理とセキュリティ確保
     */
    private function process_accordion_content($content) {
        if (empty($content)) {
            return '';
        }

        // 改行を保持しつつHTMLを適切に処理
        $content = wpautop($content);

        // 許可するHTMLタグを定義
        $allowed_html = array(
            'h4' => array(),
            'p' => array(),
            'strong' => array(),
            'em' => array(),
            'br' => array(),
            'img' => array(
                'src' => true,
                'alt' => true,
                'width' => true,
                'height' => true,
                'class' => true,
                'style' => true
            ),
            'a' => array(
                'href' => true,
                'target' => true,
                'rel' => true
            ),
            'ul' => array(),
            'ol' => array(),
            'li' => array(),
            'blockquote' => array(),
            'code' => array(),
            'pre' => array()
        );

        // HTMLをサニタイズ
        $content = wp_kses($content, $allowed_html);

        return $content;
    }

    /**
     * フロントエンド用スクリプトとスタイルの読み込み（改良版）
     */
    public function frontend_enqueue_scripts() {
        // スクリプトの読み込み
        wp_enqueue_script(
            'accordion-notes-frontend-js',
            ACCORDION_NOTES_PLUGIN_URL . 'frontend.js',
            array('jquery'),
            ACCORDION_NOTES_VERSION,
            true
        );

        // スタイルシートの読み込み
        wp_enqueue_style(
            'accordion-notes-frontend-css',
            ACCORDION_NOTES_PLUGIN_URL . 'frontend.css',
            array(),
            ACCORDION_NOTES_VERSION
        );

        // 条件付きで最適化スクリプトを追加
        if (wp_is_mobile()) {
            wp_add_inline_script(
                'accordion-notes-frontend-js',
                'jQuery(document).ready(function($) {
                    $.fx.speeds._default = 200;
                    $("body").addClass("accordion-mobile-optimized");
                });',
                'after'
            );
        }
    }
}
new AccordionNotesPlugin();
?>
