const postContainer = document.getElementById('post-container'); // العنصر الذي سيتم عرض المنشورات فيه
const loadingMessage = document.getElementById('loading-message'); // العنصر الذي يعرض رسالة التحميل
const loadMoreButton = document.getElementById('load-more-btn'); // زر لتحميل المزيد من المنشورات
const liveUpdateContainer = document.getElementById('live-update-container'); // عنصر لعرض التحديثات الحية
const commentFilter = document.getElementById('comment-filter'); // عنصر فلترة التعليقات
let isLoading = false; // متغير لتتبع حالة التحميل لمنع تحميل بيانات متعددة في نفس الوقت
let currentPage = 0; // متغير لتتبع الصفحة الحالية لعرض المنشورات
const PAGE_LIMIT = 10; // عدد المنشورات التي يتم تحميلها في كل مرة
const INITIAL_COMMENT_COUNT = 3; // عدد التعليقات التي يتم عرضها في البداية

// دالة لجلب المنشورات من API
async function fetchPosts(type, start = 0, limit = PAGE_LIMIT) {
    try {
        // جلب قائمة المعرفات من API
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/${type}.json`);
        const ids = await response.json(); // تحويل الاستجابة إلى JSON
        const posts = [];

        // جلب المنشورات بناءً على معرفاتها
        for (let i = start; i < start + limit; i++) {
            if (i >= ids.length) break; // التحقق من عدم تجاوز عدد المعرفات
            const post = await fetch(`https://hacker-news.firebaseio.com/v0/item/${ids[i]}.json`);
            posts.push(await post.json()); // إضافة المنشور إلى القائمة
        }

        return posts; // إرجاع قائمة المنشورات
    } catch (error) {
        console.error('Error fetching posts:', error); // التعامل مع الأخطاء في حال وجودها
    }
}

// دالة لجلب التعليقات الخاصة بالمنشور
async function fetchComments(commentIds) {
    const comments = [];
    for (const commentId of commentIds) {
        try {
            const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`);
            const comment = await response.json();
            comments.push(comment);
        } catch (error) {
            console.error('Error fetching comment:', error);
        }
    }
    return comments;
}

// دالة لعرض التعليقات بناءً على الفلتر
function filterComments(comments, filter) {
    if (filter === 'high') {
        return comments.sort((a, b) => b.score - a.score); // تصنيف التعليقات بناءً على الدرجة
    } else if (filter === 'low') {
        return comments.sort((a, b) => a.score - b.score); // تصنيف التعليقات بناءً على الدرجة
    }
    return comments; // إرجاع التعليقات كما هي إذا كان الفلتر هو "all"
}

// دالة لعرض المنشورات والتعليقات
async function displayPosts(posts) {
    postContainer.innerHTML = ''; // مسح محتوى الحاوية قبل إضافة المنشورات الجديدة
    for (const post of posts) {
        const postDiv = document.createElement('div'); // إنشاء عنصر div لكل منشور
        postDiv.className = 'post'; // تعيين فئة CSS للعنصر

        // جلب التعليقات الخاصة بالمنشور إذا كانت موجودة
        let commentsHtml = '';
        let showCommentsButton = '';

        if (post.kids && post.kids.length > 0) {
            // عرض عدد محدود من التعليقات في البداية
            const comments = await fetchComments(post.kids.slice(0, INITIAL_COMMENT_COUNT));
            const filteredComments = filterComments(comments, commentFilter.value);
            commentsHtml = filteredComments.map(comment => `
                <div class="comment" data-comment-id="${comment.id}">
                    <p>${comment.text}</p>
                    <button class="show-comment-btn" data-comment-id="${comment.id}">Read More</button>
                </div>
            `).join('');
            
            // زر لعرض جميع التعليقات
            showCommentsButton = `
                <button class="show-all-comments-btn" data-post-id="${post.id}">Show All Comments</button>
            `;
        }

        postDiv.innerHTML = `
            <h2>${post.title}</h2> <!-- عنوان المنشور -->
            <p>By: ${post.by}</p> <!-- اسم الكاتب -->
            <p>Score: ${post.score}</p> <!-- درجة التقييم -->
            <a href="${post.url}" target="_blank">Read more</a> <!-- رابط لقراءة المزيد -->
            <div class="comments-container">
                ${commentsHtml} <!-- عرض التعليقات -->
                ${showCommentsButton} <!-- زر عرض جميع التعليقات -->
            </div>
        `;
        postContainer.appendChild(postDiv); // إضافة العنصر إلى الحاوية
    }
}

// دالة لعرض المزيد من التعليقات عند الضغط على زر "Read More"
async function showMoreComment(commentId, buttonElement) {
    try {
        // جلب التعليق بناءً على المعرف
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`);
        const comment = await response.json();
        
        const commentHtml = `
            <div class="comment">
                <p>${comment.text}</p>
            </div>
        `;
        buttonElement.insertAdjacentHTML('beforebegin', commentHtml);
        buttonElement.remove(); // إزالة زر "Read More" بعد عرض التعليق
    } catch (error) {
        console.error('Error showing more comment:', error);
    }
}

// دالة لعرض جميع التعليقات عند الضغط على زر "Show All Comments"
async function showAllComments(postId, buttonElement) {
    try {
        // جلب المنشور بناءً على المعرف
        const postResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${postId}.json`);
        const post = await postResponse.json();
        
        if (post.kids && post.kids.length > 0) {
            const comments = await fetchComments(post.kids); // جلب جميع التعليقات
            const filteredComments = filterComments(comments, commentFilter.value);
            const commentsHtml = filteredComments.map(comment => `
                <div class="comment">
                    <p>${comment.text}</p>
                </div>
            `).join('');
            // تحديث المحتوى لعرض جميع التعليقات
            buttonElement.insertAdjacentHTML('beforebegin', commentsHtml);
            buttonElement.remove(); // إزالة زر "Show All Comments" بعد عرض جميع التعليقات
        }
    } catch (error) {
        console.error('Error showing all comments:', error);
    }
}

// دالة لتحميل المزيد من المنشورات
async function loadMorePosts(type) {
    if (isLoading) return; // التحقق من عدم وجود عملية تحميل جارية
    isLoading = true; // تعيين حالة التحميل إلى true
    loadingMessage.style.display = 'block'; // عرض رسالة التحميل
    const posts = await fetchPosts(type, currentPage * PAGE_LIMIT, PAGE_LIMIT); // جلب المنشورات
    await displayPosts(posts); // عرض المنشورات
    isLoading = false; // تعيين حالة التحميل إلى false
    loadingMessage.style.display = 'none'; // إخفاء رسالة التحميل
    currentPage++; // الانتقال إلى الصفحة التالية
}

// دالة للتعامل مع التحديثات الحية
async function updateLiveData() {
    let latestPosts = [];
    setInterval(async () => {
        try {
            const newPosts = await fetchPosts('newstories', 0, 5); // جلب أحدث 5 منشورات
            if (JSON.stringify(newPosts) !== JSON.stringify(latestPosts)) {
                liveUpdateContainer.innerHTML = `
                    <h3>Live Updates</h3>
                    ${newPosts.map(post => `<p>${post.title}</p>`).join('')}
                `; // عرض المنشورات الجديدة
                latestPosts = newPosts;
            }
        } catch (error) {
            console.error('Error fetching live data:', error);
        }
    }, 5000); // التحديث كل 30 ثانية
}

// معالجة الضغط على زر "Load More Posts"
loadMoreButton.addEventListener('click', () => loadMorePosts('topstories'));

// معالجة تغيير فلتر التعليقات
commentFilter.addEventListener('change', () => {
    // إعادة تحميل المنشورات بعد تغيير الفلتر
    loadMorePosts('topstories');
});

// معالجة الضغط على زر "Read More" لعرض المزيد من التعليقات
postContainer.addEventListener('click', event => {
    if (event.target.classList.contains('show-comment-btn')) {
        const commentId = event.target.getAttribute('data-comment-id');
        showMoreComment(commentId, event.target);
    }
});

// معالجة الضغط على زر "Show All Comments" لعرض جميع التعليقات
postContainer.addEventListener('click', event => {
    if (event.target.classList.contains('show-all-comments-btn')) {
        const postId = event.target.getAttribute('data-post-id');
        showAllComments(postId, event.target);
    }
});

// بدء التحديثات الحية
updateLiveData();
