(function () {
    'use strict';

    var CUSTOMPOST_VERSION = 'v6-2026-05-15-content-bottom';
    if (window.console) console.log('[custompost] loaded', CUSTOMPOST_VERSION);

    var CONTAINER_ID = 'custompost-list';
    var urlMatch = window.location.href.match(/post(\d+)\.vov/);
    var nid = urlMatch ? urlMatch[1] : '1';
    var API_URL = 'https://vov-api.vov.vn/api/vovvn/article/related-categories?nid=' + nid + '&limit=60';
    var BATCH = 3;

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildItem(item) {
        var link = escapeHtml(item.link || '#');
        var title = escapeHtml(item.title || '');
        var thumb = escapeHtml(item.thumbnail || '');

        return (
            '' +
            '<div class="col-12 col-sm-6 col-lg-4" style="margin-bottom: 20px;">' +
            '<article class="custompost__item">' +
            '<a class="custompost__thumb d-block" href="' +
            link +
            '" title="' +
            title +
            '">' +
            (thumb
                ? '<img src="' +
                thumb +
                '" alt="' +
                title +
                '" class="img-fluid w-100" style="object-fit: cover; aspect-ratio: 16 / 9;" loading="lazy">'
                : '') +
            '</a>' +
            '<h3 style="text-align: start;" class=" mt-1 mb-0 vovvn-title ">' +
            '<a class="media-title" style="text-align: justify;" href="' +
            link +
            '">' +
            title +
            '</a>' +
            '</h3>' +
            '</article>' +
            '</div>'
        );
    }

    function init() {
        var container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        if (!document.getElementById('custompost-style')) {
            var style = document.createElement('style');
            style.id = 'custompost-style';
            style.textContent = '.ads-block-custom .vovvn-title.title-block::after{content:"\\f2f6";font-family:Material-Design-Iconic-Font;color:#c02a29;margin-left:5px;font-size:15px;}';
            document.head.appendChild(style);
        }

        var row = null;
        var el = container.parentElement;
        while (el) {
            if (el.classList && el.classList.contains('row') && el.children.length > 1) {
                row = el;
            }
            el = el.parentElement;
        }
        var ourCol = null;
        var siblingCol = null;
        if (row) {
            for (var i = 0; i < row.children.length; i++) {
                var child = row.children[i];
                if (child.contains(container)) {
                    ourCol = child;
                } else if (!siblingCol || child.offsetHeight > siblingCol.offsetHeight) {
                    siblingCol = child;
                }
            }
        }

        var detailEl = document.querySelector('.detail.detail--normal');
        var relatedEl = document.querySelector('.field-related-article');
        var TOLERANCE = 200;

        fetch(API_URL)
            .then(function (res) {
                return res.json();
            })
            .then(function (json) {
                var items = (json && json.data) || [];
                if (!items.length) return;

                var categoryName = json.category_name || '';
                var categoryUrl = json.category_url || '';


                container.innerHTML =
                    '<div class="ads-block-custom">' +
                    '<a href="' + "https://vov.vn" + categoryUrl + '" class="vovvn-title title-block d-block" style=" text-align: left;font-weight:700;font-size:1.25rem;line-height:1.4375rem;color:#c02a29;">' +
                    escapeHtml(categoryName) +
                    '</a>' +
                    '<div class="row custompost__row mt-2"></div>' +
                    '</div>';

                var rowEl = container.querySelector('.custompost__row');
                var blockEl = container.querySelector('.ads-block-custom');
                var rendered = 0;
                var fitScheduled = false;

                var titleLink = blockEl ? blockEl.querySelector('.title-block') : null;

                function syncVisibility() {
                    if (!titleLink) return;
                    var want = rendered > 0 ? '' : 'none';
                    if (titleLink.style.display !== want) {
                        titleLink.style.display = want;
                    }
                }
                syncVisibility();

                // Cột Bootstrap flex-stretch nên rect.bottom của col === nhau.
                // Phải lấy bottom thực của content = max bottom của các child có visible rect.
                function contentBottom(col) {
                    if (!col) return 0;
                    var max = -Infinity;
                    for (var i = 0; i < col.children.length; i++) {
                        var rect = col.children[i].getBoundingClientRect();
                        // display:none → rect toàn 0; bỏ qua
                        if (rect.width === 0 && rect.height === 0) continue;
                        if (rect.bottom > max) max = rect.bottom;
                    }
                    return max === -Infinity ? col.getBoundingClientRect().top : max;
                }

                function overflow() {
                    if (!siblingCol || !ourCol) return 0;
                    return contentBottom(ourCol) - contentBottom(siblingCol);
                }

                function fit() {
                    fitScheduled = false;
                    if (!siblingCol) {
                        // Fallback: render hết
                        if (rendered < items.length) {
                            var rest = items.slice(rendered);
                            rowEl.insertAdjacentHTML('beforeend', rest.map(buildItem).join(''));
                            rendered = items.length;
                        }
                        return;
                    }

                    var guard = 0;
                    while (rendered < items.length && overflow() < -TOLERANCE && guard++ < 50) {
                        var batch = items.slice(rendered, rendered + BATCH);
                        rowEl.insertAdjacentHTML('beforeend', batch.map(buildItem).join(''));
                        rendered += batch.length;
                    }

                    var trimCount = 0;
                    guard = 0;
                    while (rendered > 0 && overflow() > TOLERANCE && guard++ < 50) {
                        for (var i = 0; i < BATCH && rendered > 0 && rowEl.lastElementChild; i++) {
                            rowEl.removeChild(rowEl.lastElementChild);
                            rendered--;
                            trimCount++;
                        }
                    }

                    syncVisibility();

                    if (window.console) {
                        console.log('[custompost] fit',
                            '| rendered:', rendered,
                            '| overflow:', overflow().toFixed(0),
                            '| trimmed:', trimCount,
                            '| title:', titleLink && titleLink.style.display);
                    }
                }

                function scheduleFit() {
                    if (fitScheduled) return;
                    fitScheduled = true;
                    requestAnimationFrame(fit);
                }

                fit();
                if (window.console) {
                    console.log('[custompost] init',
                        CUSTOMPOST_VERSION,
                        '| items:', items.length,
                        '| rendered:', rendered,
                        '| ourBottom:', contentBottom(ourCol).toFixed(0),
                        '| sibBottom:', contentBottom(siblingCol).toFixed(0),
                        '| overflow:', overflow().toFixed(0),
                        '| ourCol:', ourCol && ourCol.className,
                        '| siblingCol:', siblingCol && siblingCol.className);
                }

                // Re-fit khi bất kỳ phần nào ở cột chính/phụ thay đổi chiều cao
                // (mgid inject _mgwidget, Facebook plugin load, ảnh lazy-load...)
                if (typeof ResizeObserver !== 'undefined') {
                    var ro = new ResizeObserver(scheduleFit);
                    if (siblingCol) ro.observe(siblingCol);
                    if (detailEl) ro.observe(detailEl);
                    if (relatedEl) ro.observe(relatedEl);
                    if (ourCol) ro.observe(ourCol);
                    setTimeout(function () {
                        ro.disconnect();
                    }, 20000);
                }

                setTimeout(scheduleFit, 1500);
                setTimeout(scheduleFit, 3500);
                setTimeout(scheduleFit, 7000);
            })
            .catch(function (err) {
                if (window.console) console.error('[custompost] fetch failed', err);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
