// State Management
let productsState = [];
let searchDebounceTimeout = null;

// DOM Elements
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

const statTotal = document.getElementById('stat-total');
const statLowStock = document.getElementById('stat-low-stock');
const statValuation = document.getElementById('stat-valuation');

const toastContainer = document.getElementById('toast-container');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    
    // Form Submission
    productForm.addEventListener('submit', handleFormSubmit);
    btnCancel.addEventListener('click', clearForm);
    
    // Search Filtering
    searchInput.addEventListener('input', handleSearchInput);
    searchClearBtn.addEventListener('click', clearSearch);
    
    // Refresh button
    btnRefresh.addEventListener('click', () => {
        showToast('Syncing inventory database...', 'info');
        fetchProducts(searchInput.value);
    });
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
    
    // Fade out and remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3500);
}

// Fetch Products from REST API
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
        updateStats();
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Failed to load products. Please check connection.', 'error');
        showEmptyState(true);
    } finally {
        showLoading(false);
    }
}

// Render Catalog Grid
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
        
        // Stock Status styling
        let stockClass = 'stock-in';
        let stockText = `${product.quantity} in stock`;
        if (product.quantity === 0) {
            stockClass = 'stock-out';
            stockText = 'Out of Stock';
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
            <p class="product-desc" title="${escapeHtml(product.description || '')}">${escapeHtml(product.description || 'No description provided.')}</p>
            <div class="card-footer">
                <div class="price-container">
                    <span class="price-label">Price</span>
                    <span class="price-val">$${parseFloat(product.price).toFixed(2)}</span>
                </div>
            </div>
            
            <!-- Quick Actions Overlay -->
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
    
    // Refresh Icons
    lucide.createIcons();
}

// Calculate and Update Dashboard Stats
function updateStats() {
    statTotal.textContent = productsState.length;
    
    const lowStockCount = productsState.filter(p => p.quantity < 5).length;
    statLowStock.textContent = lowStockCount;
    
    const totalValuation = productsState.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    statValuation.textContent = `$${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Form Validation and Submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
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
    btnSubmit.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px;display:inline-block"></span> Saving...`;
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const errorDetails = await response.json();
            if (errorDetails.errors) {
                // Validation error from backend
                displayBackendErrors(errorDetails.errors);
                throw new Error("Validation failure from backend server");
            }
            throw new Error(`Failed to save product. HTTP Status ${response.status}`);
        }
        
        showToast(isEdit ? 'Product updated successfully' : 'Product created successfully', 'success');
        clearForm();
        fetchProducts(searchInput.value);
        
    } catch (error) {
        console.error('Save error:', error);
        if (!error.message.includes("Validation failure")) {
            showToast('An error occurred while saving the product.', 'error');
        }
    } finally {
        btnSubmit.disabled = false;
        updateSubmitButtonLabel(isEdit);
    }
}

// Client Side Form Validation
function validateForm() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.error-msg').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
    });
    document.querySelectorAll('.form-group').forEach(el => {
        el.classList.remove('invalid');
    });
    
    // Name validation
    if (!productNameInput.value.trim()) {
        showFieldError('name-error', 'Product name is required');
        productNameInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    }
    
    // Category validation
    if (!productCategoryInput.value.trim()) {
        showFieldError('category-error', 'Category is required');
        productCategoryInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    }
    
    // Price validation
    const priceVal = parseFloat(productPriceInput.value);
    if (isNaN(priceVal)) {
        showFieldError('price-error', 'Price is required');
        productPriceInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    } else if (priceVal < 0.01) {
        showFieldError('price-error', 'Price must be greater than zero');
        productPriceInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    }
    
    // Quantity validation
    const quantityVal = parseInt(productQuantityInput.value);
    if (isNaN(quantityVal)) {
        showFieldError('quantity-error', 'Quantity is required');
        productQuantityInput.closest('.form-group').classList.add('invalid');
        isValid = false;
    } else if (quantityVal < 0) {
        showFieldError('quantity-error', 'Quantity cannot be negative');
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
            if (inputEl) {
                inputEl.closest('.form-group').classList.add('invalid');
            }
        }
    });
    showToast('Please fix the validation errors.', 'error');
}

// Edit Mode Activation
window.editProduct = function(id) {
    const product = productsState.find(p => p.id === id);
    if (!product) return;
    
    // Populate form
    productIdInput.value = product.id;
    productNameInput.value = product.name;
    productCategoryInput.value = product.category;
    productPriceInput.value = product.price;
    productQuantityInput.value = product.quantity;
    productDescriptionInput.value = product.description || '';
    
    // Style Form Header
    formTitle.textContent = 'Edit Product';
    formIcon.setAttribute('data-lucide', 'edit-3');
    updateSubmitButtonLabel(true);
    lucide.createIcons();
    
    // Scroll to form on mobile viewports
    productForm.scrollIntoView({ behavior: 'smooth' });
    showToast(`Loaded "${product.name}" for editing`, 'info');
};

// Delete Product
window.deleteProduct = async function(id) {
    const product = productsState.find(p => p.id === id);
    if (!product) return;
    
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to delete. Status: ${response.status}`);
        }
        
        showToast(`Product "${product.name}" deleted`, 'success');
        
        // If we were editing this deleted product, clear the form
        if (productIdInput.value == id) {
            clearForm();
        }
        
        fetchProducts(searchInput.value);
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete product.', 'error');
    }
};

// Reset Form
function clearForm() {
    productIdInput.value = '';
    productForm.reset();
    
    // Clear errors
    document.querySelectorAll('.error-msg').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
    });
    document.querySelectorAll('.form-group').forEach(el => {
        el.classList.remove('invalid');
    });
    
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

// Search Filtering with Debounce
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
    }, 400); // 400ms debounce
}

function clearSearch() {
    searchInput.value = '';
    searchClearBtn.style.display = 'none';
    fetchProducts();
}

// UI State Toggles
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

// Helper: Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
