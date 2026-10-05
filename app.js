const API_URL = "https://script.google.com/macros/s/AKfycbxMKeFeshxXhEspKNfZHBCcLVsK3HCXIUq0rXAvUMes53gjzHjc9v2rhf3USsXs2Jy7/exec";

// --- State ---
let inventory = [];

// --- DOM Elements ---
const refreshBtn = document.getElementById('refreshBtn');
const itemsContainer = document.getElementById('itemsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const itemModal = document.getElementById('itemModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const itemForm = document.getElementById('itemForm');
const modalTitle = document.getElementById('modalTitle');
const saveItemBtn = document.getElementById('saveItemBtn');
const saveSpinner = document.getElementById('saveSpinner');
const toast = document.getElementById('toast');

// Form inputs
const inputId = document.getElementById('itemId');
const inputName = document.getElementById('itemName');
const inputCategory = document.getElementById('itemCategory');
const inputQty = document.getElementById('itemQty');
const inputUnit = document.getElementById('itemUnit');
const inputExpiry = document.getElementById('itemExpiry');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchItems();
    setupEventListeners();
    
    // Set default date to today for presets logic
    inputExpiry.value = getFormattedDate(new Date());
});

// --- API Calls ---

async function fetchItems() {
    showLoading(true);
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Filter out Depleted, calculate days left, and sort
        const now = new Date();
        now.setHours(0,0,0,0);
        
        inventory = data
            .filter(item => item.Status !== 'Depleted')
            .map(item => {
                const expiryDate = new Date(item.Expiry_Date);
                const diffTime = expiryDate - now;
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...item, daysLeft };
            })
            .sort((a, b) => {
                const dateA = new Date(a.Expiry_Date);
                const dateB = new Date(b.Expiry_Date);
                return dateA - dateB;
            });
            
        renderItems();
    } catch (error) {
        console.error("Error fetching items:", error);
        showToast("Failed to load items.");
    } finally {
        showLoading(false);
    }
}

async function apiRequest(bodyData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8", // text/plain to avoid CORS preflight
        },
        body: JSON.stringify(bodyData)
    });
    return await response.json();
}

// --- UI Rendering ---

function renderItems() {
    itemsContainer.innerHTML = '';
    
    if (inventory.length === 0) {
        itemsContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    emptyState.classList.add('hidden');
    itemsContainer.classList.remove('hidden');
    
    inventory.forEach(item => {
        // Color coding
        let colorClass = "bg-green-100 text-green-800 border-green-200";
        let icon = "fa-check-circle text-green-500";
        let statusText = `${item.daysLeft} days left`;
        
        if (item.daysLeft <= 0) {
            colorClass = "bg-red-100 text-red-800 border-red-200";
            icon = "fa-triangle-exclamation text-red-500";
            statusText = item.daysLeft < 0 ? `Expired ${Math.abs(item.daysLeft)} days ago` : "Expires today!";
        } else if (item.daysLeft <= 2) {
            colorClass = "bg-red-100 text-red-800 border-red-200";
            icon = "fa-triangle-exclamation text-red-500";
        } else if (item.daysLeft <= 5) {
            colorClass = "bg-orange-100 text-orange-800 border-orange-200";
            icon = "fa-clock text-orange-500";
        }
        
        const card = document.createElement('div');
        card.className = `bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">${item.Item_Name}</h3>
                    <p class="text-sm text-gray-500">${item.Category || 'No Category'} &bull; ${item.Remaining_Qty} ${item.Unit}</p>
                </div>
                <div class="${colorClass} px-3 py-1 rounded-full text-xs font-bold border flex items-center shadow-sm">
                    <i class="fa-solid ${icon} mr-1.5"></i>
                    ${statusText}
                </div>
            </div>
            
            <div class="flex justify-between mt-3 pt-3 border-t border-gray-100">
                <button onclick="editItem('${item.ID}')" class="text-blue-600 font-medium py-2 px-4 bg-blue-50 rounded-xl w-[48%] flex justify-center items-center active:bg-blue-100">
                    <i class="fa-solid fa-pen-to-square mr-2"></i> Edit
                </button>
                <button onclick="markDepleted('${item.ID}')" class="text-gray-600 font-medium py-2 px-4 bg-gray-100 rounded-xl w-[48%] flex justify-center items-center active:bg-gray-200">
                    <i class="fa-solid fa-trash mr-2"></i> ใช้หมดแล้ว
                </button>
            </div>
        `;
        itemsContainer.appendChild(card);
    });
}

// --- Interactions ---

async function markDepleted(id) {
    if (!confirm("Confirm mark as depleted?")) return;
    
    // Optimistic UI update (hide immediately)
    const itemCard = document.querySelector(`button[onclick="markDepleted('${id}')"]`).closest('.bg-white');
    if (itemCard) itemCard.style.display = 'none';
    
    // Backup and remove from local array
    const backupItem = inventory.find(i => i.ID === id);
    inventory = inventory.filter(i => i.ID !== id);
    renderItems(); // Re-render instantly
    
    try {
        const result = await apiRequest({
            action: 'deplete',
            id: id,
            updates: { Status: 'Depleted' }
        });
        
        if (result.success) {
            showToast("Item removed.");
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error depleting item:", error);
        showToast("Failed to remove item.");
        // Restore on failure
        if (backupItem) {
            inventory.push(backupItem);
            inventory.sort((a, b) => new Date(a.Expiry_Date) - new Date(b.Expiry_Date));
            renderItems();
        }
    }
}

function editItem(id) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;
    
    modalTitle.textContent = "Edit Item";
    inputId.value = item.ID;
    inputName.value = item.Item_Name;
    inputQty.value = item.Remaining_Qty;
    inputUnit.value = item.Unit;
    
    // Format date properly for input type=date
    if (item.Expiry_Date) {
        const d = new Date(item.Expiry_Date);
        inputExpiry.value = getFormattedDate(d);
    }
    
    // Select category chip
    selectCategoryChip(item.Category);
    
    itemModal.classList.remove('hidden');
}

// --- Event Listeners ---

function setupEventListeners() {
    refreshBtn.addEventListener('click', () => {
        refreshBtn.querySelector('i').classList.add('fa-spin');
        fetchItems().then(() => {
            refreshBtn.querySelector('i').classList.remove('fa-spin');
        });
    });
    
    openAddModalBtn.addEventListener('click', () => {
        resetForm();
        modalTitle.textContent = "Add to Fridge";
        itemModal.classList.remove('hidden');
    });
    
    closeModalBtn.addEventListener('click', () => {
        itemModal.classList.add('hidden');
    });
    
    // Category Chips
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-val');
            selectCategoryChip(val);
        });
    });
    
    // Expiry Presets
    document.querySelectorAll('.expiry-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const days = parseInt(e.target.getAttribute('data-days'));
            const date = new Date();
            date.setDate(date.getDate() + days);
            inputExpiry.value = getFormattedDate(date);
        });
    });
    
    // Form Submit
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isUpdate = !!inputId.value;
        const submitText = saveItemBtn.querySelector('span');
        submitText.textContent = "Saving...";
        saveSpinner.classList.remove('hidden');
        saveItemBtn.disabled = true;
        
        const formData = {
            Item_Name: inputName.value.trim(),
            Category: inputCategory.value,
            Remaining_Qty: parseFloat(inputQty.value),
            Unit: inputUnit.value,
            Expiry_Date: inputExpiry.value,
            Purchase_Date: getFormattedDate(new Date())
        };
        
        try {
            // Helper to calc days left
            const calcDays = (dateStr) => {
                const now = new Date();
                now.setHours(0,0,0,0);
                return Math.ceil((new Date(dateStr) - now) / (1000 * 60 * 60 * 24));
            };

            if (isUpdate) {
                await apiRequest({ action: 'update', id: inputId.value, updates: formData });
                // Update local array
                const index = inventory.findIndex(i => i.ID === inputId.value);
                if (index !== -1) {
                    inventory[index] = { ...inventory[index], ...formData, daysLeft: calcDays(formData.Expiry_Date) };
                }
            } else {
                formData.Status = 'Active';
                const result = await apiRequest({ action: 'add', item: formData });
                if (result.success) {
                    formData.ID = result.id || 'ITEM-' + Date.now();
                    formData.daysLeft = calcDays(formData.Expiry_Date);
                    inventory.push(formData);
                }
            }
            
            // Re-sort locally and re-render without fetching
            inventory.sort((a, b) => new Date(a.Expiry_Date) - new Date(b.Expiry_Date));
            showToast(isUpdate ? "Item updated!" : "Item added!");
            itemModal.classList.add('hidden');
            renderItems(); // Instant update
        } catch (error) {
            console.error("Error saving:", error);
            showToast("Failed to save item.");
        } finally {
            submitText.textContent = "Save to Fridge";
            saveSpinner.classList.add('hidden');
            saveItemBtn.disabled = false;
        }
    });
}

// --- Helpers ---

function showLoading(show) {
    if (show) {
        loadingIndicator.style.display = 'flex';
        loadingIndicator.classList.remove('hidden');
        itemsContainer.classList.add('hidden');
        emptyState.style.display = 'none';
        emptyState.classList.add('hidden');
    } else {
        loadingIndicator.style.display = 'none';
        loadingIndicator.classList.add('hidden');
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3000);
}

function getFormattedDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

function selectCategoryChip(val) {
    inputCategory.value = val;
    document.querySelectorAll('.category-chip').forEach(chip => {
        if (chip.getAttribute('data-val') === val) {
            chip.classList.remove('bg-gray-100', 'text-gray-700');
            chip.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        } else {
            chip.classList.add('bg-gray-100', 'text-gray-700');
            chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        }
    });
}

function resetForm() {
    inputId.value = '';
    inputName.value = '';
    inputQty.value = '1';
    inputUnit.value = 'ชิ้น';
    inputExpiry.value = getFormattedDate(new Date());
    
    // Deselect all chips
    inputCategory.value = '';
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.add('bg-gray-100', 'text-gray-700');
        chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
    });
}
