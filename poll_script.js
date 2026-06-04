

(function ($, Drupal, drupalSettings) {
    const path = drupalSettings.path.currentPath;
    if (path.includes('node/')) {
        
        /// POLL FORM
        const API_URL = 'https://api-vov.solidtech.vn';
        var tagCookie = 'VOTE_HAS_BEEN_SELECTED';
        var body = $('body');
        const polls = $('div[data-embed-button="poll"]');
        polls.each(function () {
            const that = $(this);
            const uuid = $(this).data('entity-uuid');
            const cookie = getCookie(tagCookie + '_' + uuid.toUpperCase());
            if (cookie) {
                getViewResultPoll(that);
            } else {
                getFormPoll(that);
            }
        })

        // Khi chọn form sẽ ẩn thông báo lỗi
        body.on('change', '.poll-form-vote .form-radio-poll', function () {
            const form = $(this).closest('.poll-form-vote');
            $('.error', $(form)).addClass('d-none');
        });

        body.on('submit', '.poll-form-vote', function () {
            event.preventDefault();
            const that = $(this).closest('div[data-entity-type="poll"]')
            const uuid = $(that).data('entity-uuid');
            const selectedValue = $('.form-radio:checked', $(this)).val();
            if (!selectedValue) {
                $('.error', $(this)).removeClass('d-none')
                return;
            }

            const form = $(this).serialize();
            $.ajax({
                url: API_URL + '/api/poll/save?' + form,
                success: function success(res) {
                    if (res?.id) {
                        setCookie(tagCookie + '_' + uuid.toUpperCase());
                        getViewResultPoll(that);
                    }
                }
            });
        })

        // VIEW RESULT
        body.on('click', '.btn-view-result', function () {
            const that = $(this).closest('div[data-entity-type="poll"]')
            getViewResultPoll(that);
        })

        // BACK
        body.on('click', '.btn-back', function () {
            const that = $(this).closest('div[data-entity-type="poll"]')
            getFormPoll(that);
        })

        function getFormPoll(that) {
            const uuid = $(that).data('entity-uuid');
            if (!uuid) return '';
            $.ajax({
                url: API_URL + '/api/poll/form?uuid=' + uuid,
                success: function success(res) {
                    $(that.html(res))
                }
            });
        }

        function getViewResultPoll(that) {
            const uuid = $(that).data('entity-uuid');
            if (!uuid) return '';
            $.ajax({
                url: API_URL + '/api/poll/result?uuid=' + uuid,
                success: function success(res) {
                    $(that).html(res);
                    const cookie = getCookie(tagCookie + '_' + uuid.toUpperCase());
                    if (cookie) {
                        $('.btn-back', $(that)).remove();
                    }
                }
            });
        }

        function setCookie(tagCookie, day = 1) {
            const date = new Date();
            date.setTime(date.getTime() + (day * 24 * 60 * 60 * 1000)); // mặc định 1 ngày
            const expires = "expires=" + date.toUTCString();
            document.cookie = tagCookie + "=true; " + expires + "; path=/";
        }
        function getCookie(name) {
            var nameEQ = name + "=";
            var decodedCookie = decodeURIComponent(document.cookie);
            var cookiesArray = decodedCookie.split(';');
            for (var i = 0; i < cookiesArray.length; i++) {
                var cookie = cookiesArray[i].trim();
                if (cookie.indexOf(nameEQ) === 0) {
                    return cookie.substring(nameEQ.length);
                }
            }
            return null;
        }
    }


})(jQuery, Drupal, drupalSettings);
