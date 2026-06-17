// State Management
let productsState = [];
let cartState = [];
let searchDebounceTimeout = null;

// DOM Elements: Products
const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('product-id');
const productNameInput = document.getElementById('product-name');
const productCategoryInput = document.getElementById('product-category');
const productPriceInput = document.getElementById('product-price');
const productQuantityInput = document.getElementById('product-quantity');
const productDescriptionInput = document.getElementById('product-description');

const formTitle = document.getElementById('form-title');
const formIcon = document.getElementById('form-icon');
const btnSubmit = document.getElementById('btn-submit');
const btnCancel = document.getElementById('btn-cancel');

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear');
const btnRefresh = document.getElementById('btn-refresh');

const productsGrid = document.getElementById('products-grid');
const loadingSpinner = document.getElementById('loading-spinner');
const emptyState = document.getElementById('empty-state');

// DOM Elements: Cart
const cartLoading = document.getElementById('cart-loading');
const cartEmpty = document.getElementById('cart-empty');
const cartItemsContainer = document.getElementById('cart-items');
const cartSummary = document.getElementById('cart-summary');
const cartSubtotalVal = document.getElementById('cart-subtotal-val');
const cartTotalVal = document.getElementById('cart-total-val');
const btnClearCart = document.getElementById('btn-clear-cart');
const btnCheckout = document.getElementById('btn-checkout');

// DOM Elements: Header Stats
const statTotal = document.getElementById('stat-total');
const statLowStock = document.getElementById('stat-low-stock');
const statCartCount = document.getElementById('stat-cart-count');
const statCartTotal = document.getElementById('stat-cart-total');

const toastContainer = document.getElementById('toast-container');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial sync
    fetchProducts();
    fetchCart();
    
    // Product actions
    productForm.addEventListener('submit', handleFormSubmit);
    btnCancel.addEventListener('click', clearForm);
    
    // Search filter
    searchInput.addEventListener('input', handleSearchInput);
    searchClearBtn.addEventListener('click', clearSearch);
    
    // Refresh
    btnRefresh.addEventListener('click', () => {
        showToast('Refreshing microservice databases...', 'info');
        fetchProducts(searchInput.value);
        fetchCart();
    });
    
    // Cart actions
    btnClearCart.addEventListener('click', clearCart);
    btnCheckout.addEventListener('click', checkoutCart);
});

// Toast System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'info') iconName = 'info';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i data-lucide="${iconName}"></i>
        </div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3500);
}

// ------------------- Product REST Calls -------------------

async function fetchProducts(search = '') {
    showLoading(true);
    try {
        let url = '/api/products';
        if (search.trim()) {
            url += `?search=${encodeURIComponent(search.trim())}`;
            searchClearBtn.style.display = 'flex';
        } else {
            searchClearBtn.style.display = 'none';
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        productsState = data;
        renderCatalog();
        updateProductStats();
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Product Service is currently offline.', 'error');
        showEmptyState(true);
    } finally {
        showLoading(false);
    }
}

function renderCatalog() {
    productsGrid.innerHTML = '';
    
    if (productsState.length === 0) {
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    
    productsState.forEach(product => {
        const card = document.createElement('div');
        card.className = 'glass-panel product-card';
        
        let stockClass = 'stock-in';
        let stockText = `${product.quantity} in stock`;
        let isOutOfStock = false;
        
        if (product.quantity === 0) {
            stockClass = 'stock-out';
            stockText = 'Out of Stock';
            isOutOfStock = true;
        } else if (product.quantity < 5) {
            stockClass = 'stock-low';
            stockText = 'Low Stock';
        }
        
        card.innerHTML = `
            <div class="card-header">
                <span class="category-tag">${escapeHtml(product.category)}</span>
                <span class="stock-status ${stockClass}">
                    <span class="stock-dot"></span>
                    <span>${stockText}</span>
                </span>
            </div>
            <h3 class="product-title">${escapeHtml(product.name)}</h3>
            <p class="product-desc" title="${escapeHtml(product.description || '')}">${escapeHtml(product.description || 'No description.')}</p>
            <div class="card-footer">
                <div class="price-container">
                    <span class="price-label">Price</span>
                    <span class="price-val">$${parseFloat(product.price).toFixed(2)}</span>
                </div>
                <button class="btn-add-to-cart" onclick="addToCart(${product.id})" ${isOutOfStock ? 'disabled' : ''}>
                    <i data-lucide="shopping-cart"></i> Add
                </button>
            </div>
            
            <div class="card-actions">
                <button class="btn-action btn-action-edit" onclick="editProduct(${product.id})" title="Edit Product">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-action btn-action-delete" onclick="deleteProduct(${product.id})" title="Delete Product">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        
        productsGrid.appendChild(card);
    });
    
    lucide.createIcons();
}

function updateProductStats() {
    statTotal.textContent = productsState.length;
    const lowStockCount = productsState.filter(p => p.quantity < 5).length;
    statLowStock.textContent = lowStockCount;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;
    
    const id = productIdInput.value;
    const productData = {
        name: productNameInput.value.trim(),
        category: productCategoryInput.value.trim(),
        price: parseFloat(productPriceInput.value),
        quantity: parseInt(productQuantityInput.value),
        description: productDescriptionInput.value.trim()
    };
    
    const isEdit = id !== '';
    const url = isEdit ? `/api/products/${id}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';
    
    btnSubmit.disabled = true;
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const errorDetails = await response.json();
            if (errorDetails.errors) {
                displayBackendErrors(errorDetails.errors);
                throw new Error("Validation failure");
            }
            throw new Error(`Failed to save`);
        }
        
        showToast(isEdit ? 'Product updated' : 'Product created', 'success');
        clearForm();
        fetchProducts(searchInput.value);
        // Refresh cart in case product metadata (name, price) changed
        fetchCart();
        
    } catch (error) {
        console.error(error);
        if (!error.message.includes("Validation failure")) {
            showToast('Failed to connect to Product Service.', 'error');
        }
    } finally {
        btnSubmit.disabled = false;
        updateSubmitButtonLabel(isEdit);
    }
}

function validateForm() {
    let isValid = true;
    document.querySelectorAll('.error-msg').forEach(el => { el.textContent = ''; el.classList.remove('visible'); });
    document.querySelectorAll('.form-group').forEach(el => { el.classList.remove('invalid'); });
    
    if (!productNameInput.value.trim()) {
        showFieldError('name-error', 'Name is required');
        productNameInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    }
    if (!productCategoryInput.value.trim()) {
        showFieldError('category-error', 'Category is required');
        productCategoryInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    }
    const priceVal = parseFloat(productPriceInput.value);
    if (isNaN(priceVal) || priceVal < 0.01) {
        showFieldError('price-error', 'Price must be > 0');
        productPriceInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    }
    const qtyVal = parseInt(productQuantityInput.value);
    if (isNaN(qtyVal) || qtyVal < 0) {
        showFieldError('quantity-error', 'Quantity must be >= 0');
        productQuantityInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    }
    return isValid;
}

function showFieldError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    errorEl.textContent = message;
    errorEl.classList.add('visible');
}

function displayBackendErrors(errors) {
    Object.keys(errors).forEach(field => {
        const errorMsgId = `${field}-error`;
        const errorEl = document.getElementById(errorMsgId);
        if (errorEl) {
            showFieldError(errorMsgId, errors[field]);
            const inputEl = document.getElementById(`product-${field}`);
            if (inputEl) inputEl.closest('.form-group').classList.add('invalid');
        }
    });
}

window.editProduct = function(id) {
    const product = productsState.find(p => p.id === id);
    if (!product) return;
    
    productIdInput.value = product.id;
    productNameInput.value = product.name;
    productCategoryInput.value = product.category;
    productPriceInput.value = product.price;
    productQuantityInput.value = product.quantity;
    productDescriptionInput.value = product.description || '';
    
    formTitle.textContent = 'Edit Product';
    formIcon.setAttribute('data-lucide', 'edit-3');
    updateSubmitButtonLabel(true);
    lucide.createIcons();
    productForm.scrollIntoView({ behavior: 'smooth' });
};

window.deleteProduct = async function(id) {
    const product = productsState.find(p => p.id === id);
    if (!product) return;
    if (!confirm(`Delete "${product.name}"?`)) return;
    
    try {
        const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error();
        
        showToast(`Product "${product.name}" deleted`, 'success');
        if (productIdInput.value == id) clearForm();
        fetchProducts(searchInput.value);
        fetchCart(); // Sync cart in case the deleted item was in the cart
    } catch (error) {
        showToast('Failed to delete product.', 'error');
    }
};

function clearForm() {
    productIdInput.value = '';
    productForm.reset();
    document.querySelectorAll('.error-msg').forEach(el => { el.textContent = ''; el.classList.remove('visible'); });
    document.querySelectorAll('.form-group').forEach(el => { el.classList.remove('invalid'); });
    formTitle.textContent = 'Add New Product';
    formIcon.setAttribute('data-lucide', 'plus-circle');
    updateSubmitButtonLabel(false);
    lucide.createIcons();
}

function updateSubmitButtonLabel(isEdit) {
    btnSubmit.innerHTML = isEdit 
        ? `<i data-lucide="save"></i> Update Product`
        : `<i data-lucide="save"></i> Save Product`;
    lucide.createIcons();
}

function handleSearchInput(e) {
    const query = e.target.value;
    if (query.trim()) {
        searchClearBtn.style.display = 'flex';
    } else {
        searchClearBtn.style.display = 'none';
    }
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        fetchProducts(query);
    }, 400);
}

function clearSearch() {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    fetchProducts();
}

// ------------------- Cart REST Calls -------------------

async function fetchCart() {
    showCartLoading(true);
    try {
        const response = await fetch('/api/cart');
        if (!response.ok) throw new Error();
        
        const data = await response.json();
        cartState = data;
        renderCart();
        updateCartStats();
    } catch (error) {
        console.error('Error fetching cart:', error);
        // Do not crash UI, show offline state
        showCartEmpty(true);
    } finally {
        showCartLoading(false);
    }
}

function renderCart() {
    cartItemsContainer.innerHTML = '';
    
    if (cartState.length === 0) {
        showCartEmpty(true);
        return;
    }
    
    showCartEmpty(false);
    
    cartState.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        
        const subtotal = parseFloat(item.price) * item.quantity;
        
        row.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name" title="${escapeHtml(item.productName)}">${escapeHtml(item.productName)}</span>
                <span class="cart-item-price">$${parseFloat(item.price).toFixed(2)} each</span>
            </div>
            <div class="cart-item-controls">
                <button class="cart-qty-btn" onclick="removeFromCart(${item.productId}, 1)">-</button>
                <span class="cart-qty-val">${item.quantity}</span>
                <button class="cart-qty-btn" onclick="addToCart(${item.productId}, 1)">+</button>
            </div>
            <div class="cart-item-subtotal">$${subtotal.toFixed(2)}</div>
            <button class="btn-icon-only btn-remove-item" onclick="removeFromCart(${item.productId}, ${item.quantity})" title="Remove all">
                <i data-lucide="trash-2"></i>
            </button>
        `;
        cartItemsContainer.appendChild(row);
    });
    
    lucide.createIcons();
}

function updateCartStats() {
    const totalCount = cartState.reduce((sum, item) => sum + item.quantity, 0);
    statCartCount.textContent = totalCount;
    
    const valuation = cartState.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const valuationStr = `$${valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    statCartTotal.textContent = valuationStr;
    cartSubtotalVal.textContent = valuationStr;
    cartTotalVal.textContent = valuationStr;
}

window.addToCart = async function(productId, qty = 1) {
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: productId, quantity: qty })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Verification failure');
        }
        
        showToast('Cart updated', 'success');
        fetchCart();
    } catch (error) {
        showToast(error.message || 'Cart Service or Product validation failed.', 'error');
    }
};

window.removeFromCart = async function(productId, qty = 1) {
    try {
        const response = await fetch('/api/cart/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: productId, quantity: qty })
        });
        
        if (!response.ok) throw new Error();
        
        showToast('Cart updated', 'info');
        fetchCart();
    } catch (error) {
        showToast('Failed to update cart.', 'error');
    }
};

async function clearCart() {
    try {
        const response = await fetch('/api/cart/clear', { method: 'DELETE' });
        if (!response.ok) throw new Error();
        
        showToast('Cart cleared', 'info');
        fetchCart();
    } catch (error) {
        showToast('Failed to clear cart.', 'error');
    }
}

async function checkoutCart() {
    try {
        const response = await fetch('/api/cart/clear', { method: 'DELETE' });
        if (!response.ok) throw new Error();
        
        showToast('Checkout successful! Thanks for shopping.', 'success');
        fetchCart();
    } catch (error) {
        showToast('Checkout failed.', 'error');
    }
}

// ------------------- UI State Toggles -------------------

function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
    if (show) {
        productsGrid.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        productsGrid.style.display = 'grid';
    }
}

function showEmptyState(show) {
    emptyState.style.display = show ? 'flex' : 'none';
    if (show) {
        productsGrid.style.display = 'none';
    } else if (loadingSpinner.style.display !== 'flex') {
        productsGrid.style.display = 'grid';
    }
}

function showCartLoading(show) {
    cartLoading.style.display = show ? 'flex' : 'none';
    if (show) {
        cartEmpty.style.display = 'none';
        cartItemsContainer.style.display = 'none';
        cartSummary.style.display = 'none';
    } else {
        cartItemsContainer.style.display = 'flex';
    }
}

function showCartEmpty(show) {
    cartEmpty.style.display = show ? 'flex' : 'none';
    if (show) {
        cartItemsContainer.style.display = 'none';
        cartSummary.style.display = 'none';
        statCartCount.textContent = '0';
        statCartTotal.textContent = '$0.00';
    } else {
        cartItemsContainer.style.display = 'flex';
        cartSummary.style.display = 'block';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
