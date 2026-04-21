// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBNJBWUmEU9N7VCfwrZguNwe6uvSvo3Bc0",
    authDomain: "muslim-app-b5d84.firebaseapp.com",
    projectId: "muslim-app-b5d84",
    storageBucket: "muslim-app-b5d84.firebasestorage.app",
    messagingSenderId: "689424439088",
    appId: "1:689424439088:web:8d98b6b1717db285c81af5",
    measurementId: "G-8PN8NEMBCM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Variables
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// --- Common Functions ---
function updateCartCount() {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.innerText = count;
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// --- Home Page Logic ---
if (document.getElementById('products-container')) {
    loadStoreSettings();
    loadBanners();
    loadProducts();
    updateCartCount();
}

function loadStoreSettings() {
    db.collection('settings').doc('store').get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.logo) {
                const logoImg = document.getElementById('store-logo') || document.getElementById('admin-logo');
                if (logoImg) logoImg.src = data.logo;
            }
        }
    });
}

function loadBanners() {
    const bannerContainer = document.getElementById('banner-container');
    if (!bannerContainer) return;
    db.collection('banners').get().then(snapshot => {
        if (snapshot.empty) return;
        bannerContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const banner = doc.data();
            bannerContainer.innerHTML += `<div class="swiper-slide"><img src="${banner.url}" style="width:100%; border-radius:10px;"></div>`;
        });
    });
}

function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    db.collection('products').get().then(snapshot => {
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const p = doc.data();
            const id = doc.id;
            container.innerHTML += `
                <div class="product-card">
                    <img src="${p.image}" class="product-image" alt="${p.name}">
                    <div class="product-info">
                        <div class="product-title">${p.name}</div>
                        <div class="product-price">${p.price} ر.س</div>
                        <button class="btn btn-primary" style="margin-top:10px; padding:8px;" onclick="addToCart('${id}', '${p.name}', ${p.price}, '${p.image}')">أضف للسلة</button>
                    </div>
                </div>
            `;
        });
    });
}

function addToCart(id, name, price, image) {
    const index = cart.findIndex(item => item.id === id);
    if (index > -1) {
        cart[index].quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    saveCart();
    alert('تمت الإضافة للسلة');
}

// --- Cart Page Logic ---
if (document.getElementById('cart-items-container')) {
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center">السلة فارغة</p>';
        updateCartSummary();
        return;
    }
    container.innerHTML = '';
    cart.forEach((item, index) => {
        container.innerHTML += `
            <div class="admin-card" style="display: flex; gap: 15px; align-items: center;">
                <img src="${item.image}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${item.name}</div>
                    <div style="color: var(--primary-color);">${item.price} ر.س</div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                        <button onclick="updateQty(${index}, -1)" style="padding: 2px 8px;">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQty(${index}, 1)" style="padding: 2px 8px;">+</button>
                    </div>
                </div>
                <i class="fas fa-trash" style="color: #e74c3c;" onclick="removeFromCart(${index})"></i>
            </div>
        `;
    });
    updateCartSummary();
}

function updateQty(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity < 1) cart[index].quantity = 1;
    saveCart();
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

function updateCartSummary() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total-price');
    const checkoutTotalEl = document.getElementById('checkout-total');
    if (subtotalEl) subtotalEl.innerText = subtotal + ' ر.س';
    if (totalEl) totalEl.innerText = subtotal + ' ر.س';
    if (checkoutTotalEl) checkoutTotalEl.innerText = subtotal + ' ر.س';
}

// --- Checkout Logic ---
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    updateCartSummary();
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (cart.length === 0) return alert('السلة فارغة');
        
        const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
        const orderData = {
            orderId: orderId,
            customer: {
                name: document.getElementById('customer-name').value,
                phone: document.getElementById('customer-phone').value,
                city: document.getElementById('customer-city').value,
                address: document.getElementById('customer-address').value
            },
            items: cart,
            total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('orders').add(orderData).then(() => {
            cart = [];
            saveCart();
            alert('تم تقديم طلبك بنجاح! رقم الطلب: ' + orderId);
            location.href = 'track.html?id=' + orderId;
        });
    });
}

// --- Tracking Logic ---
const trackBtn = document.getElementById('track-btn');
if (trackBtn) {
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    if (idParam) {
        document.getElementById('track-order-id').value = idParam;
        trackOrder(idParam);
    }

    trackBtn.addEventListener('click', () => {
        const id = document.getElementById('track-order-id').value;
        trackOrder(id);
    });
}

function trackOrder(orderId) {
    if (!orderId) return;
    db.collection('orders').where('orderId', '==', orderId).get().then(snapshot => {
        if (snapshot.empty) {
            alert('الطلب غير موجود');
            return;
        }
        const order = snapshot.docs[0].data();
        document.getElementById('track-result').classList.remove('hidden');
        
        const statusMap = {
            'pending': 'تم استلام الطلب',
            'processing': 'جاري التجهيز',
            'shipped': 'تم الشحن',
            'delivered': 'تم التوصيل'
        };
        
        document.getElementById('track-status').innerText = statusMap[order.status];
        
        // Reset steps
        document.querySelectorAll('.step div').forEach(d => d.style.background = '#eee');
        
        const steps = ['pending', 'processing', 'shipped', 'delivered'];
        const currentIdx = steps.indexOf(order.status);
        steps.forEach((step, idx) => {
            if (idx <= currentIdx) {
                document.querySelector(`#step-${step} div`).style.background = 'var(--primary-color)';
            }
        });

        let itemsHtml = '<h5>تفاصيل الطلب:</h5>';
        order.items.forEach(item => {
            itemsHtml += `<div style="display:flex; justify-content:space-between; font-size:14px; margin-top:5px;">
                <span>${item.name} x ${item.quantity}</span>
                <span>${item.price * item.quantity} ر.س</span>
            </div>`;
        });
        itemsHtml += `<div style="text-align:left; font-weight:bold; margin-top:10px; border-top:1px solid #eee; padding-top:5px;">الإجمالي: ${order.total} ر.س</div>`;
        document.getElementById('track-order-details').innerHTML = itemsHtml;
    });
}

// --- Admin Logic ---
function loadAdminOrders() {
    const list = document.getElementById('admin-orders-list');
    if (!list) return;
    db.collection('orders').orderBy('createdAt', 'desc').get().then(snapshot => {
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const id = doc.id;
            list.innerHTML += `
                <div class="admin-card order-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>#${order.orderId}</strong>
                        <span class="status-badge status-${order.status}">${order.status}</span>
                    </div>
                    <div style="font-size:14px; margin:10px 0;">
                        <div>العميل: ${order.customer.name}</div>
                        <div>الجوال: ${order.customer.phone}</div>
                        <div>الإجمالي: ${order.total} ر.س</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <select onchange="updateOrderStatus('${id}', this.value)" style="padding:5px; font-size:12px;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>جاري التجهيز</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
                        </select>
                        <button class="btn" style="background:#e74c3c; color:white; padding:5px 10px; width:auto;" onclick="deleteOrder('${id}')">حذف</button>
                    </div>
                </div>
            `;
        });
    });
}

function updateOrderStatus(docId, newStatus) {
    db.collection('orders').doc(docId).update({ status: newStatus }).then(() => {
        alert('تم تحديث حالة الطلب');
    });
}

function deleteOrder(docId) {
    if (confirm('هل أنت متأكد من حذف الطلب؟')) {
        db.collection('orders').doc(docId).delete().then(() => loadAdminOrders());
    }
}

function loadAdminProducts() {
    const list = document.getElementById('admin-products-list');
    if (!list) return;
    db.collection('products').get().then(snapshot => {
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const p = doc.data();
            const id = doc.id;
            list.innerHTML += `
                <div class="admin-card" style="display:flex; gap:10px; align-items:center;">
                    <img src="${p.image}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${p.name}</div>
                        <div style="color:var(--primary-color);">${p.price} ر.س</div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button onclick="editProduct('${id}')" style="background:none; border:none; color:var(--primary-color);"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteProduct('${id}')" style="background:none; border:none; color:#e74c3c;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    });
}

function saveProduct() {
    const id = document.getElementById('edit-product-id').value;
    const data = {
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        image: document.getElementById('p-image').value,
        desc: document.getElementById('p-desc').value,
        category: document.getElementById('p-category').value
    };

    if (id) {
        db.collection('products').doc(id).update(data).then(() => {
            alert('تم التحديث');
            closeProductModal();
            loadAdminProducts();
        });
    } else {
        db.collection('products').add(data).then(() => {
            alert('تمت الإضافة');
            closeProductModal();
            loadAdminProducts();
        });
    }
}

function editProduct(id) {
    db.collection('products').doc(id).get().then(doc => {
        const p = doc.data();
        document.getElementById('edit-product-id').value = id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-image').value = p.image;
        document.getElementById('p-desc').value = p.desc;
        document.getElementById('p-category').value = p.category;
        openProductModal(id);
    });
}

function deleteProduct(id) {
    if (confirm('حذف المنتج؟')) {
        db.collection('products').doc(id).delete().then(() => loadAdminProducts());
    }
}

function loadAdminBanners() {
    const list = document.getElementById('admin-banners-list');
    if (!list) return;
    db.collection('banners').get().then(snapshot => {
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const b = doc.data();
            list.innerHTML += `
                <div class="admin-card" style="position:relative;">
                    <img src="${b.url}" style="width:100%; border-radius:5px;">
                    <button onclick="deleteBanner('${doc.id}')" style="position:absolute; top:10px; left:10px; background:rgba(231,76,60,0.8); color:white; border:none; border-radius:50%; width:30px; height:30px;"><i class="fas fa-times"></i></button>
                </div>
            `;
        });
    });
}

function addBanner() {
    const url = document.getElementById('banner-url').value;
    if (!url) return;
    db.collection('banners').add({ url }).then(() => {
        document.getElementById('banner-url').value = '';
        loadAdminBanners();
    });
}

function deleteBanner(id) {
    db.collection('banners').doc(id).delete().then(() => loadAdminBanners());
}

function loadAdminSettings() {
    db.collection('settings').doc('store').get().then(doc => {
        if (doc.exists) {
            document.getElementById('settings-logo-url').value = doc.data().logo || '';
        }
    });
}

function updateStoreSettings() {
    const logo = document.getElementById('settings-logo-url').value;
    db.collection('settings').doc('store').set({ logo }, { merge: true }).then(() => {
        alert('تم حفظ الإعدادات');
        loadStoreSettings();
    });
}

// Initial Load for Admin
if (document.getElementById('admin-orders-list')) {
    loadAdminOrders();
    loadStoreSettings();
}
