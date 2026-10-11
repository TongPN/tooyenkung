// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyA4WRTEmiXsqqUtfoGVqMjECd41JAlua8w",
  authDomain: "tooyenkung-72ac9.firebaseapp.com",
  projectId: "tooyenkung-72ac9",
  storageBucket: "tooyenkung-72ac9.firebasestorage.app",
  messagingSenderId: "562253307247",
  appId: "1:562253307247:web:aaecac4898a8f1f4435c9a"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Optional: Enable offline persistence for snappy local caching
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    console.warn("Firestore offline persistence notice:", err.code);
});

// --- Security / Family PIN ---
const FAMILY_PIN = "1234"; // Default Family PIN

// --- State ---
let inventory = [];
const DEFAULT_UNITS = ['ชิ้น', 'กล่อง', 'ขวด', 'ถุง', 'ฟอง', 'แพ็ค', 'กรัม', 'กก.', 'จาน', 'ห่อ'];
let units = [...DEFAULT_UNITS];

// --- DOM Elements ---
const pinLockScreen = document.getElementById('pinLockScreen');
const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');

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

// Units Modal Elements
const unitsModal = document.getElementById('unitsModal');
const manageUnitsBtn = document.getElementById('manageUnitsBtn');
const closeUnitsModalBtn = document.getElementById('closeUnitsModalBtn');
const newUnitInput = document.getElementById('newUnitInput');
const addNewUnitBtn = document.getElementById('addNewUnitBtn');
const unitsListContainer = document.getElementById('unitsListContainer');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkFamilyPinAuth();
    setupEventListeners();
    
    // Set default date to today for presets logic
    inputExpiry.value = getFormattedDate(new Date());
});

// --- Family PIN Authentication ---

function checkFamilyPinAuth() {
    const isAuth = localStorage.getItem('tooyenkung_pin_auth');
    if (isAuth === 'true') {
        pinLockScreen.classList.add('hidden');
        startRealtimeListeners();
    } else {
        pinLockScreen.classList.remove('hidden');
        pinInput.focus();
    }
}

pinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pinInput.value === FAMILY_PIN) {
        localStorage.setItem('tooyenkung_pin_auth', 'true');
        pinLockScreen.classList.add('hidden');
        pinError.classList.add('hidden');
        startRealtimeListeners();
    } else {
        pinError.classList.remove('hidden');
        pinInput.value = '';
        pinInput.focus();
    }
});

function startRealtimeListeners() {
    listenToUnits();
    listenToInventory();
}

// --- Realtime Database Listeners (Firestore) ---

function listenToInventory() {
    showLoading(true);
    db.collection('inventory').onSnapshot((snapshot) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const items = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Show only Active and Low items (hide Depleted)
            if (data.Status !== 'Depleted') {
                const expiryDate = new Date(data.Expiry_Date);
                const diffTime = expiryDate - now;
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                items.push({
                    ID: doc.id,
                    id: doc.id,
                    ...data,
                    daysLeft
                });
            }
        });

        // Sort items by Expiry_Date (closest expiry first)
        items.sort((a, b) => new Date(a.Expiry_Date) - new Date(b.Expiry_Date));
        inventory = items;
        renderItems();
        showLoading(false);
    }, (error) => {
        console.error("Firestore inventory listener error:", error);
        showLoading(false);
        showToast("ไม่สามารถโหลดข้อมูลจากคลาวด์ได้");
    });
}

function listenToUnits() {
    db.collection('settings').doc('units').onSnapshot((doc) => {
        if (doc.exists && Array.isArray(doc.data().list) && doc.data().list.length > 0) {
            units = doc.data().list;
        } else {
            // Seed default units if database is new
            units = [...DEFAULT_UNITS];
            db.collection('settings').doc('units').set({ list: DEFAULT_UNITS }, { merge: true });
        }
        saveUnitsLocal(units);
        populateUnitSelect(inputUnit.value);
        renderUnitsList();
    }, (error) => {
        console.error("Firestore units listener error:", error);
    });
}

// --- Unit Management ---

function saveUnitsLocal(unitsList) {
    units = unitsList;
    localStorage.setItem('tooyenkung_units', JSON.stringify(unitsList));
}

function populateUnitSelect(selectedVal) {
    inputUnit.innerHTML = '';
    
    if (selectedVal && !units.includes(selectedVal)) {
        units.push(selectedVal);
    }
    
    units.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        if (u === selectedVal) opt.selected = true;
        inputUnit.appendChild(opt);
    });
    
    // Quick Add trigger
    const addOpt = document.createElement('option');
    addOpt.value = '__ADD_NEW__';
    addOpt.textContent = '+ เพิ่มหน่วยใหม่...';
    inputUnit.appendChild(addOpt);
    
    if (!selectedVal && units.length > 0) {
        inputUnit.value = units[0];
    }
}

function openUnitsModal() {
    renderUnitsList();
    newUnitInput.value = '';
    unitsModal.classList.remove('hidden');
    setTimeout(() => newUnitInput.focus(), 150);
}

function renderUnitsList() {
    unitsListContainer.innerHTML = '';
    
    if (units.length === 0) {
        unitsListContainer.innerHTML = '<p class="text-gray-400 text-sm py-2">ไม่มีหน่วยนับ</p>';
        return;
    }
    
    units.forEach((u) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100';
        row.innerHTML = `
            <span class="font-medium text-gray-800">${u}</span>
            <div class="flex items-center space-x-2">
                <button type="button" onclick="editUnitName('${u}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-blue-600 bg-blue-50 active:bg-blue-100" title="แก้ไขชื่อ">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button type="button" onclick="deleteUnitName('${u}')" class="w-8 h-8 flex items-center justify-center rounded-lg text-red-600 bg-red-50 active:bg-red-100" title="ลบหน่วยนี้">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>
        `;
        unitsListContainer.appendChild(row);
    });
}

async function addNewUnit() {
    const name = newUnitInput.value.trim();
    if (!name) return;
    
    if (units.includes(name)) {
        showToast("หน่วยนี้มีอยู่แล้ว");
        return;
    }
    
    newUnitInput.value = '';
    showToast(`เพิ่มหน่วย "${name}" เรียบร้อย`);
    
    try {
        await db.collection('settings').doc('units').set({
            list: firebase.firestore.FieldValue.arrayUnion(name)
        }, { merge: true });
    } catch (err) {
        console.error("Error adding unit to Firestore:", err);
    }
}

async function editUnitName(oldName) {
    const newName = prompt(`แก้ไขชื่อหน่วย "${oldName}" เป็น:`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    
    const trimmed = newName.trim();
    if (units.includes(trimmed)) {
        showToast("มีหน่วยนี้อยู่แล้ว");
        return;
    }
    
    showToast(`เปลี่ยนชื่อหน่วยเป็น "${trimmed}" แล้ว`);
    
    try {
        const updated = units.map(u => u === oldName ? trimmed : u);
        await db.collection('settings').doc('units').set({ list: updated }, { merge: true });
    } catch (err) {
        console.error("Error updating unit in Firestore:", err);
    }
}

async function deleteUnitName(name) {
    if (!confirm(`ต้องการลบหน่วย "${name}" ใช่หรือไม่?`)) return;
    showToast(`ลบหน่วย "${name}" แล้ว`);
    
    try {
        await db.collection('settings').doc('units').update({
            list: firebase.firestore.FieldValue.arrayRemove(name)
        });
    } catch (err) {
        console.error("Error deleting unit in Firestore:", err);
    }
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
                    <p class="text-sm text-gray-500">${item.Category || 'No Category'}</p>
                </div>
                <div class="${colorClass} px-3 py-1 rounded-full text-xs font-bold border flex items-center shadow-sm">
                    <i class="fa-solid ${icon} mr-1.5"></i>
                    ${statusText}
                </div>
            </div>
            
            <!-- Quick Quantity Adjustment Stepper -->
            <div class="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl my-2 border border-gray-100">
                <span class="text-xs font-semibold text-gray-500">คงเหลือในตู้:</span>
                <div class="flex items-center space-x-2">
                    <button onclick="adjustQty('${item.ID}', -1)" class="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-700 flex items-center justify-center font-bold active:bg-gray-200 text-sm" title="ลด 1 ${item.Unit}">
                        <i class="fa-solid fa-minus text-xs"></i>
                    </button>
                    <span class="font-bold text-base text-gray-800 min-w-[3.5rem] text-center">
                        ${item.Remaining_Qty} <span class="text-xs font-normal text-gray-500">${item.Unit}</span>
                    </span>
                    <button onclick="adjustQty('${item.ID}', 1)" class="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-700 flex items-center justify-center font-bold active:bg-gray-200 text-sm" title="เพิ่ม 1 ${item.Unit}">
                        <i class="fa-solid fa-plus text-xs"></i>
                    </button>
                </div>
            </div>
            
            <div class="flex justify-between mt-2 pt-2 border-t border-gray-100">
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

// --- Quick Quantity Adjustment ---

async function adjustQty(id, delta) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;

    const currentQty = parseFloat(item.Remaining_Qty) || 0;
    const newQty = Math.round((currentQty + delta) * 10) / 10;
    
    if (newQty <= 0) {
        if (confirm(`คุณใช้ "${item.Item_Name}" จนหมดแล้วใช่หรือไม่?\nต้องการนำออกจากตู้เย็นเลยไหม?`)) {
            markDepleted(id);
            return;
        } else {
            return;
        }
    }

    // Optimistic UI update
    item.Remaining_Qty = newQty;
    renderItems();
    showToast(`ปรับ "${item.Item_Name}" เหลือ ${newQty} ${item.Unit}`);

    try {
        await db.collection('inventory').doc(id).update({
            Remaining_Qty: newQty,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error("Firestore update qty error:", err);
        showToast("บันทึกจำนวนไม่สำเร็จ");
    }
}

// --- Interactions ---

async function markDepleted(id) {
    if (!confirm("Confirm mark as depleted?")) return;
    
    // Optimistic UI update
    const backupItem = inventory.find(i => i.ID === id);
    inventory = inventory.filter(i => i.ID !== id);
    renderItems();
    showToast("Item removed.");
    
    try {
        await db.collection('inventory').doc(id).update({
            Status: 'Depleted',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error depleting item in Firestore:", error);
        showToast("Failed to remove item.");
        if (backupItem) {
            inventory.push(backupItem);
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
    
    populateUnitSelect(item.Unit);
    
    if (item.Expiry_Date) {
        const d = new Date(item.Expiry_Date);
        inputExpiry.value = getFormattedDate(d);
    }
    
    selectCategoryChip(item.Category);
    itemModal.classList.remove('hidden');
}

// --- Event Listeners ---

function setupEventListeners() {
    refreshBtn.addEventListener('click', () => {
        refreshBtn.querySelector('i').classList.add('fa-spin');
        setTimeout(() => {
            refreshBtn.querySelector('i').classList.remove('fa-spin');
            showToast("อัปเดตข้อมูลสดแล้ว");
        }, 500);
    });
    
    openAddModalBtn.addEventListener('click', () => {
        resetForm();
        modalTitle.textContent = "Add to Fridge";
        populateUnitSelect();
        itemModal.classList.remove('hidden');
    });
    
    closeModalBtn.addEventListener('click', () => {
        itemModal.classList.add('hidden');
    });
    
    // Unit modal triggers
    manageUnitsBtn.addEventListener('click', () => {
        openUnitsModal();
    });
    
    closeUnitsModalBtn.addEventListener('click', () => {
        unitsModal.classList.add('hidden');
    });
    
    addNewUnitBtn.addEventListener('click', () => {
        addNewUnit();
    });
    
    newUnitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewUnit();
        }
    });
    
    inputUnit.addEventListener('change', () => {
        if (inputUnit.value === '__ADD_NEW__') {
            openUnitsModal();
        }
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
    
    // Form Submit (Save to Firestore)
    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isUpdate = !!inputId.value;
        const submitText = saveItemBtn.querySelector('span');
        submitText.textContent = "Saving...";
        saveSpinner.classList.remove('hidden');
        saveItemBtn.disabled = true;
        
        const formData = {
            Item_Name: inputName.value.trim(),
            Category: inputCategory.value || 'อื่นๆ',
            Remaining_Qty: parseFloat(inputQty.value) || 1,
            Unit: inputUnit.value || 'ชิ้น',
            Expiry_Date: inputExpiry.value,
            Purchase_Date: getFormattedDate(new Date())
        };
        
        try {
            if (isUpdate) {
                await db.collection('inventory').doc(inputId.value).update({
                    ...formData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showToast("Item updated!");
            } else {
                formData.Status = 'Active';
                formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                formData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('inventory').add(formData);
                showToast("Item added!");
            }
            
            itemModal.classList.add('hidden');
        } catch (error) {
            console.error("Error saving to Firestore:", error);
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
    inputExpiry.value = getFormattedDate(new Date());
    populateUnitSelect();
    
    // Deselect all chips
    inputCategory.value = '';
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.add('bg-gray-100', 'text-gray-700');
        chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
    });
}
