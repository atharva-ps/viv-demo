(function ($, drupalSettings) {
    function fromNow(
        date,
        nowDate = Date.now(),
        rft = new Intl.RelativeTimeFormat(drupalSettings.path.currentLanguage || 'vi', {numeric: "auto"})
    ) {
        const SECOND = 1000;
        const MINUTE = 60 * SECOND;
        const HOUR = 60 * MINUTE;
        const DAY = 24 * HOUR;
        const WEEK = 7 * DAY;
        const MONTH = 30 * DAY;
        const YEAR = 365 * DAY;
        const intervals = [
            {ge: YEAR, divisor: YEAR, unit: "year"},
            {ge: MONTH, divisor: MONTH, unit: "month"},
            {ge: WEEK, divisor: WEEK, unit: "week"},
            {ge: DAY, divisor: DAY, unit: "day"},
            {ge: HOUR, divisor: HOUR, unit: "hour"},
            {ge: MINUTE, divisor: MINUTE, unit: "minute"},
            {ge: 30 * SECOND, divisor: SECOND, unit: "seconds"},
            {ge: 0, divisor: 1, text: "just now"}
        ];
        const now = typeof nowDate === "object" ? nowDate.getTime() : new Date(nowDate).getTime();
        const diff = now - (typeof date === "object" ? date : new Date(date)).getTime();
        const diffAbs = Math.abs(diff);
        for (const interval of intervals) {
            if (diffAbs >= interval.ge) {
                const x = Math.round(Math.abs(diff) / interval.divisor);
                const isFuture = diff < 0;
                return interval.unit ? rft.format(isFuture ? x : -x, interval.unit) : interval.text;
            }
        }
    }

    $(document).ready(function () {
        var fieldComment = $("#vov-social-field-comment");
        var vovAccountUrl = window.vovAccountLoginUrl;
        let nid = drupalSettings.statistics.data.nid;
        let lid = null;
        if(!nid) return;
        function listComment(loadMore = false) {
            let url = `${vovAccountUrl}/get-all-comment?nid=${nid}`;
            if (loadMore && lid) {
                url += `&lid=${lid}`;
            }
            fetch(url)
                .then(response => response.json())
                .then(result => {
                    if (loadMore) {
                        fieldComment.append(initHtml(result.data));
                    } else {
                        fieldComment.html(initHtml(result.data));
                    }
                    if (result.data.length > 0) {
                        lid = result.data[result.data.length - 1].cid;
                        $("#load-more-comments").show();
                    } else {
                        $("#load-more-comments").hide();
                    }
                })
                .catch(error => console.error("Lỗi khi tải bình luận!", error));
        }

        function listChildComment(cid) {
            fetch(`${vovAccountUrl}/get-by-pid?pid=${cid}`)
                .then(response => response.json())
                .then(result => {
                    if (result.data && result.data.length > 0) {
                        $(`#comment-children-${cid}`).html(initHtml(result.data));
                    }
                })
                .catch(error => console.error("Lỗi khi tải bình luận con!", error));
        }

        function resetForm(form) {
            form[0].reset();
            form.find("input[name='username']").hide();
        }

        function initHtml(data) {
            let result = "";
            data.forEach(element => {
                let avaUrl = element.user_avatar || `https://ui-avatars.com/api/?length=1&name=${element.username}`;
                result += `
                    <div class="comment-item__custom">
                        <div class="comment-item" id="vov-social-comment-${element.cid}">
                            <div class="comment-item__text">${element.content}</div>
                            <div class="comment-item__control">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="comment-item__author">
                                            <div class="comment-item__avatar">
                                                <img src="${avaUrl}" width="24" height="24">
                                            </div>
                                            <span class="comment-item__name">${element.username}</span>
                                            <span class="comment-item__time">-&nbsp;${fromNow(element.created_at)}</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6 text-end">
                                        <label class="text-vov-red ms-2 pointer reply-comment" data-cid="${element.cid}">Phản hồi</label>
                                    </div>
                                </div>
                            </div>
                            <div id="comment-children-${element.cid}" class="comment-children"></div>
                            <div id="reply-form-${element.cid}" class="reply-form" style="display: none;">
                                <form class="box-comment mt-3">
                                    <div class="mt-2 comment-form">
                                        <div class="d-flex flex-column gap-2 w-100">
                                            <textarea id="commentText-${element.cid}" name="content" class="comment-box w-100 form-item__textarea" rows="1" placeholder="Thêm phản hồi..." required></textarea>
                                            <input id="userName-${element.cid}" name="username" style="display: none" class="w-100 border px-3 py-2 rounded-2 mb-2" placeholder="Họ và tên..." />
                                        </div>
                                    </div>
                                    <div class="comment-form">
                                        <button type="submit" class="btn-vov-red btn m-auto">Gửi</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                `;
                listChildComment(element.cid);
            });
            return result;
        }

        $("body").on("click", ".reply-comment", function () {
            let cid = $(this).data("cid");
            $(`#reply-form-${cid}`).toggle();
        });

        $("body").on("input", "textarea[name='content']", function () {
            let parent = $(this).closest(".box-comment");
            let userNameInput = parent.find("input[name='username']");
            if ($(this).val().trim().length > 0) {
                userNameInput.show();
            } else {
                userNameInput.hide();
            }
        });

        $("body").on("submit", ".box-comment", function (event) {
            event.preventDefault();
            let form = $(this);
            let commentText = form.find("textarea[name='content']").val().trim();
            let userName = form.find("input[name='username']").val().trim();
            let currentComment = form.closest(".comment-item__custom");
            let parentComment = currentComment.parent().closest(".comment-item__custom");
            let parentId = parentComment.length ? parentComment.find(".reply-comment").first().data("cid") : currentComment.find(".reply-comment").first().data("cid");


            if (!commentText) {
                alert("Bình luận không thể để trống.");
                return;
            }
            if (!userName) {
                alert("Tên không thể để trống.");
                return;
            }
            if (typeof grecaptcha === "undefined") {
                console.error("Google reCAPTCHA chưa được tải!");
            } else {
                grecaptcha.ready(function () {
                    grecaptcha.execute('6LeA1IAmAAAAAFKDrtl_4OAKuuAuF0be9j953jLT', {action: 'submit'}).then(function (token) {
                        $.ajax({
                            type: "post",
                            url: vovAccountUrl + "/api/create-comment-new?lang=" + drupalSettings.path.currentLanguage,
                            data: parentId ? form.serialize()+"&nid="+ nid + "&pid="+ parentId+ "&gresponse=" + token : form.serialize()+"&nid="+ nid + "&gresponse=" + token,
                            success: function () {
                                document.getElementById("modal-comment").style.display = "flex";
                                let count = 3;
                                const interval = setInterval(() => {
                                    document.getElementById("time-count-down").textContent = count + "s";
                                    if (count === 0) {
                                        document.getElementById("modal-comment").style.display = "none";
                                        clearInterval(interval);
                                    }
                                    count--;
                                }, 1000);
                                listComment();
                                resetForm(form);
                            },
                            error: function (xhr) {
                                let res = xhr.responseJSON;
                                if (!res) {
                                    try { res = JSON.parse(xhr.responseText); } catch (e) { res = null; }
                                }
                                let details = [];
                                if (res && res.errors && Array.isArray(res.errors.content)) {
                                    details = res.errors.content;
                                }
                                alert(details.length > 0 ? details.join("\n") : "Dữ liệu không hợp lệ.");
                            },
                        });
                    });
                });
            }
        });

        $("body").on("click", "#load-more-comments", function () {
            listComment(true);
        });
        $("body").on("click", "#close-modal-comment", function () {
            document.getElementById('modal-comment').style.display = 'none'
        });
        if (fieldComment.length > 0) {
            listComment();
        }
    });
})(jQuery, drupalSettings);