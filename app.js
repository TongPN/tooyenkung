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

// --- Discrete Units Definition ---
const DISCRETE_UNITS = ['ชิ้น', 'กล่อง', 'ขวด', 'ถุง', 'ฟอง', 'แพ็ค', 'ห่อ', 'จาน', 'มัด', 'ลูก', 'หัว', 'กระป๋อง'];

function isDiscreteUnit(unit) {
    return DISCRETE_UNITS.includes(unit);
}

// --- State ---
let inventory = [];
const DEFAULT_UNITS = ['ชิ้น', 'กล่อง', 'ขวด', 'ถุง', 'ฟอง', 'แพ็ค', 'กรัม', 'กก.', 'จาน', 'ห่อ', 'มล.'];
let units = [...DEFAULT_UNITS];
let currentConsumeItem = null;

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
const inputPurchase = document.getElementById('itemPurchase');
const inputExpiry = document.getElementById('itemExpiry');

// Units Modal Elements
const unitsModal = document.getElementById('unitsModal');
const manageUnitsBtn = document.getElementById('manageUnitsBtn');
const closeUnitsModalBtn = document.getElementById('closeUnitsModalBtn');
const newUnitInput = document.getElementById('newUnitInput');
const addNewUnitBtn = document.getElementById('addNewUnitBtn');
const unitsListContainer = document.getElementById('unitsListContainer');

// History Modal Elements
const historyModal = document.getElementById('historyModal');
const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
const historyItemTitle = document.getElementById('historyItemTitle');
const historyBuyDate = document.getElementById('historyBuyDate');
const historyInitialQty = document.getElementById('historyInitialQty');
const historyUsedQty = document.getElementById('historyUsedQty');
const historyRemainingQty = document.getElementById('historyRemainingQty');
const historyTimeline = document.getElementById('historyTimeline');

// Consume Modal Elements
const consumeModal = document.getElementById('consumeModal');
const closeConsumeModalBtn = document.getElementById('closeConsumeModalBtn');
const consumeForm = document.getElementById('consumeForm');
const consumeItemId = document.getElementById('consumeItemId');
const consumeItemTitle = document.getElementById('consumeItemTitle');
const consumeCurrentStockText = document.getElementById('consumeCurrentStockText');
const consumeUnitLabel = document.getElementById('consumeUnitLabel');
const consumeUnitSuffix = document.getElementById('consumeUnitSuffix');
const consumeAmountInput = document.getElementById('consumeAmountInput');
const consumePresetsContainer = document.getElementById('consumePresetsContainer');
const consumePreviewRemaining = document.getElementById('consumePreviewRemaining');
const consumeNoteInput = document.getElementById('consumeNoteInput');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkFamilyPinAuth();
    setupEventListeners();
    
    // Set default dates to today
    const todayStr = getFormattedDate(new Date());
    inputPurchase.value = todayStr;
    inputExpiry.value = todayStr;
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
        
        const usedCount = item.usedCount || 0;
        const isDiscrete = isDiscreteUnit(item.Unit);
        
        // Smart Action Buttons based on unit type
        let actionButtonsHtml = '';
        if (isDiscrete) {
            // Discrete item (e.g. 1 ถุง, 1 ฟอง, 1 ชิ้น): Can -1 directly OR tap to enter custom amount
            actionButtonsHtml = `
                <button onclick="openHistoryModal('${item.ID}')" class="px-2.5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold shadow-sm active:bg-gray-100" title="ดูประวัติ">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                </button>
                <button onclick="openConsumeModal('${item.ID}')" class="px-3 py-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold active:bg-blue-100" title="ระบุจำนวนที่ใช้">
                    ระบุจำนวน
                </button>
                <button onclick="quickConsumeOne('${item.ID}')" class="px-3.5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center active:bg-blue-700" title="หยิบใช้ 1 ${item.Unit}">
                    <i class="fa-solid fa-minus mr-1 text-[10px]"></i>1 ${item.Unit}
                </button>
            `;
        } else {
            // Continuous item (e.g. กรัม, กก., มล.): Tap to enter grams/amount directly with smart presets
            actionButtonsHtml = `
                <button onclick="openHistoryModal('${item.ID}')" class="px-2.5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs font-bold shadow-sm active:bg-gray-100" title="ดูประวัติ">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                </button>
                <button onclick="openConsumeModal('${item.ID}')" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center active:bg-blue-700" title="หยิบใช้">
                    <i class="fa-solid fa-utensils mr-1.5 text-xs"></i>หยิบใช้ (${item.Unit})
                </button>
            `;
        }
        
        const card = document.createElement('div');
        card.className = `bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <div>
                    <h3 class="font-bold text-lg text-gray-800 leading-tight">${item.Item_Name}</h3>
                    <p class="text-xs text-gray-500 mt-0.5">${item.Category || 'ทั่วไป'}</p>
                    <p class="text-xs text-blue-600 font-medium mt-1 flex items-center">
                        <i class="fa-solid fa-cart-shopping mr-1.5 text-blue-400"></i>ซื้อเมื่อ: ${item.Purchase_Date || '-'}
                    </p>
                </div>
                <div class="${colorClass} px-3 py-1 rounded-full text-xs font-bold border flex items-center shadow-sm">
                    <i class="fa-solid ${icon} mr-1.5"></i>
                    ${statusText}
                </div>
            </div>
            
            <!-- Quantity & Consumption Bar -->
            <div class="flex items-center justify-between bg-gray-50 px-3.5 py-3 rounded-2xl my-2.5 border border-gray-100">
                <div>
                    <div class="text-[11px] font-semibold text-gray-500">คงเหลือในตู้:</div>
                    <div class="text-xl font-black text-gray-800">
                        ${item.Remaining_Qty} <span class="text-xs font-normal text-gray-500">${item.Unit}</span>
                    </div>
                    ${usedCount > 0 ? `<div class="text-[11px] text-orange-600 font-medium mt-0.5">ใช้ไปแล้ว: ${usedCount} ${item.Unit}</div>` : ''}
                </div>
                
                <div class="flex items-center space-x-1.5">
                    ${actionButtonsHtml}
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="flex justify-between mt-1 pt-2 border-t border-gray-100">
                <button onclick="editItem('${item.ID}')" class="text-blue-600 font-medium py-2 px-4 bg-blue-50 rounded-xl w-[48%] flex justify-center items-center active:bg-blue-100 text-sm">
                    <i class="fa-solid fa-pen-to-square mr-2"></i> แก้ไขข้อมูล
                </button>
                <button onclick="markDepleted('${item.ID}')" class="text-gray-600 font-medium py-2 px-4 bg-gray-100 rounded-xl w-[48%] flex justify-center items-center active:bg-gray-200 text-sm">
                    <i class="fa-solid fa-trash mr-2"></i> ใช้หมดแล้ว
                </button>
            </div>
        `;
        itemsContainer.appendChild(card);
    });
}

// --- Consumption Logic (Discrete & Grams/Continuous) ---

// 1. Quick consume 1 unit (for discrete units like egg, bag, piece)
function quickConsumeOne(id) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;
    executeConsumption(item, 1, `หยิบใช้ 1 ${item.Unit}`);
}

// 2. Open smart consume modal with contextual presets
function openConsumeModal(id) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;

    currentConsumeItem = item;
    consumeItemId.value = item.ID;
    consumeItemTitle.textContent = `หยิบใช้: ${item.Item_Name}`;
    consumeCurrentStockText.textContent = `คงเหลือปัจจุบัน: ${item.Remaining_Qty} ${item.Unit}`;
    consumeUnitLabel.textContent = item.Unit;
    consumeUnitSuffix.textContent = item.Unit;
    consumeAmountInput.value = '';
    consumeNoteInput.value = '';
    updateConsumePreview(0);

    // Generate contextual presets based on unit
    renderConsumePresets(item);

    consumeModal.classList.remove('hidden');
    setTimeout(() => consumeAmountInput.focus(), 150);
}

function renderConsumePresets(item) {
    consumePresetsContainer.innerHTML = '';
    const unit = item.Unit;
    const remaining = parseFloat(item.Remaining_Qty) || 0;
    
    let presets = [];
    if (unit === 'กรัม') {
        presets = [50, 100, 150, 200, 250, 300, 500].filter(val => val < remaining);
    } else if (unit === 'กก.') {
        presets = [0.1, 0.2, 0.3, 0.5].filter(val => val < remaining);
    } else if (unit === 'มล.') {
        presets = [50, 100, 200, 250, 500].filter(val => val < remaining);
    } else {
        // Discrete (ชิ้น, ถุง, ฟอง, ฯลฯ)
        presets = [1, 2, 3, 4, 5].filter(val => val < remaining);
    }

    // Add numeric presets
    presets.forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-3 py-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 font-bold rounded-xl text-xs active:bg-blue-200 transition-colors';
        btn.textContent = `${p} ${unit}`;
        btn.onclick = () => {
            consumeAmountInput.value = p;
            updateConsumePreview(p);
        };
        consumePresetsContainer.appendChild(btn);
    });

    // Preset: 50% (ครึ่งหนึ่ง)
    if (remaining > 1) {
        const half = Math.round((remaining / 2) * 10) / 10;
        const halfBtn = document.createElement('button');
        halfBtn.type = 'button';
        halfBtn.className = 'px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs active:bg-blue-200 transition-colors';
        halfBtn.textContent = `ครึ่งหนึ่ง (${half} ${unit})`;
        halfBtn.onclick = () => {
            consumeAmountInput.value = half;
            updateConsumePreview(half);
        };
        consumePresetsContainer.appendChild(halfBtn);
    }

    // Preset: All (ใช้หมดเลย)
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'px-3 py-1.5 bg-orange-50 text-orange-700 font-bold rounded-xl text-xs active:bg-orange-200 transition-colors';
    allBtn.textContent = `ทั้งหมด (${remaining} ${unit})`;
    allBtn.onclick = () => {
        consumeAmountInput.value = remaining;
        updateConsumePreview(remaining);
    };
    consumePresetsContainer.appendChild(allBtn);
}

function updateConsumePreview(enteredAmount) {
    if (!currentConsumeItem) return;
    const remaining = parseFloat(currentConsumeItem.Remaining_Qty) || 0;
    const amount = parseFloat(enteredAmount) || 0;
    const after = Math.round((remaining - amount) * 100) / 100;
    
    if (amount <= 0) {
        consumePreviewRemaining.textContent = `${remaining} ${currentConsumeItem.Unit}`;
        consumePreviewRemaining.className = 'font-bold text-gray-800 text-sm';
    } else if (after < 0) {
        consumePreviewRemaining.textContent = `เกินสต็อกคงเหลือ! (ขาด ${Math.abs(after)} ${currentConsumeItem.Unit})`;
        consumePreviewRemaining.className = 'font-bold text-red-500 text-sm';
    } else if (after === 0) {
        consumePreviewRemaining.textContent = `0 ${currentConsumeItem.Unit} (ใช้หมดพอดี)`;
        consumePreviewRemaining.className = 'font-bold text-orange-600 text-sm';
    } else {
        consumePreviewRemaining.textContent = `${after} ${currentConsumeItem.Unit}`;
        consumePreviewRemaining.className = 'font-bold text-blue-700 text-sm';
    }
}

// 3. Execute consumption update to Firestore
async function executeConsumption(item, amount, noteText) {
    const currentQty = parseFloat(item.Remaining_Qty) || 0;
    const newQty = Math.round((currentQty - amount) * 100) / 100;
    const currentUsed = parseFloat(item.usedCount) || 0;
    const newUsed = Math.round((currentUsed + amount) * 100) / 100;
    
    if (newQty <= 0) {
        if (!confirm(`คุณหยิบใช้ "${item.Item_Name}" จนหมดตู้แล้วใช่หรือไม่?\nต้องการตัดออกจากตู้เย็นเลยไหม?`)) {
            return;
        }
        markDepleted(item.ID);
        return;
    }

    const now = new Date();
    const historyEntry = {
        date: now.toISOString(),
        displayDate: formatDisplayTime(now),
        action: 'consume',
        amount: amount,
        remaining: newQty,
        note: noteText || `หยิบใช้ ${amount} ${item.Unit} (คงเหลือ ${newQty} ${item.Unit})`
    };

    // Optimistic UI update
    item.Remaining_Qty = newQty;
    item.usedCount = newUsed;
    if (!item.history) item.history = [];
    item.history.push(historyEntry);
    renderItems();
    showToast(`ใช้ "${item.Item_Name}" ${amount} ${item.Unit} แล้ว`);

    try {
        await db.collection('inventory').doc(item.ID).update({
            Remaining_Qty: newQty,
            usedCount: newUsed,
            history: firebase.firestore.FieldValue.arrayUnion(historyEntry),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error("Firestore update consumption error:", err);
        showToast("บันทึกข้อมูลไม่สำเร็จ");
    }
}

// --- History Modal ---

function openHistoryModal(id) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;

    historyItemTitle.textContent = item.Item_Name;
    historyBuyDate.textContent = item.Purchase_Date || '-';
    historyInitialQty.textContent = `${item.Initial_Qty || item.Remaining_Qty} ${item.Unit}`;
    historyUsedQty.textContent = `${item.usedCount || 0} ${item.Unit}`;
    historyRemainingQty.textContent = `${item.Remaining_Qty} ${item.Unit}`;

    historyTimeline.innerHTML = '';
    const logs = item.history && item.history.length > 0 ? [...item.history].reverse() : [];

    if (logs.length === 0) {
        historyTimeline.innerHTML = `
            <div class="text-center py-6 text-gray-400 text-sm">
                <i class="fa-solid fa-box-open text-2xl mb-2 text-gray-300"></i>
                <p>ยังไม่มีบันทึกการใช้งาน</p>
                <p class="text-xs mt-1">นำเข้าเมื่อ ${item.Purchase_Date || '-'}</p>
            </div>
        `;
    } else {
        logs.forEach(log => {
            const isCreate = log.action === 'create';
            const badgeBg = isCreate ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';
            const icon = isCreate ? 'fa-cart-plus' : 'fa-utensils';

            const row = document.createElement('div');
            row.className = 'bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-start space-x-3';
            row.innerHTML = `
                <div class="${badgeBg} w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="flex-1">
                    <div class="text-xs font-bold text-gray-800">${log.note || (isCreate ? 'นำเข้าตู้เย็น' : 'หยิบใช้')}</div>
                    <div class="text-[11px] text-gray-400 mt-0.5">${log.displayDate || getFormattedDate(log.date)}</div>
                </div>
            `;
            historyTimeline.appendChild(row);
        });
    }

    historyModal.classList.remove('hidden');
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
        const now = new Date();
        const depleteEntry = {
            date: now.toISOString(),
            displayDate: formatDisplayTime(now),
            action: 'deplete',
            note: 'ใช้หมดแล้ว / นำออกจากตู้เย็น'
        };

        await db.collection('inventory').doc(id).update({
            Status: 'Depleted',
            history: firebase.firestore.FieldValue.arrayUnion(depleteEntry),
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
    
    if (item.Purchase_Date) {
        inputPurchase.value = item.Purchase_Date;
    } else {
        inputPurchase.value = getFormattedDate(new Date());
    }

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

    closeHistoryModalBtn.addEventListener('click', () => {
        historyModal.classList.add('hidden');
    });

    closeConsumeModalBtn.addEventListener('click', () => {
        consumeModal.classList.add('hidden');
        currentConsumeItem = null;
    });

    // Live preview when typing amount to use
    consumeAmountInput.addEventListener('input', () => {
        updateConsumePreview(consumeAmountInput.value);
    });

    // Consume form submit
    consumeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentConsumeItem) return;

        const amount = parseFloat(consumeAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            showToast("กรุณากรอกจำนวนที่ใช้ให้ถูกต้อง");
            return;
        }

        const remaining = parseFloat(currentConsumeItem.Remaining_Qty) || 0;
        if (amount > remaining) {
            showToast(`จำนวนเกินสต็อกคงเหลือ (${remaining} ${currentConsumeItem.Unit})`);
            return;
        }

        const note = consumeNoteInput.value.trim();
        const noteText = note 
            ? `หยิบใช้ ${amount} ${currentConsumeItem.Unit} (${note})` 
            : `หยิบใช้ ${amount} ${currentConsumeItem.Unit}`;

        consumeModal.classList.add('hidden');
        executeConsumption(currentConsumeItem, amount, noteText);
        currentConsumeItem = null;
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
            // Preset calculates relative to Purchase Date if set, otherwise Today
            const baseDate = inputPurchase.value ? new Date(inputPurchase.value) : new Date();
            baseDate.setDate(baseDate.getDate() + days);
            inputExpiry.value = getFormattedDate(baseDate);
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
        
        const qtyNum = parseFloat(inputQty.value) || 1;
        const unitVal = inputUnit.value || 'ชิ้น';
        const purchaseVal = inputPurchase.value || getFormattedDate(new Date());

        const formData = {
            Item_Name: inputName.value.trim(),
            Category: inputCategory.value || 'อื่นๆ',
            Remaining_Qty: qtyNum,
            Unit: unitVal,
            Purchase_Date: purchaseVal,
            Expiry_Date: inputExpiry.value
        };
        
        try {
            if (isUpdate) {
                await db.collection('inventory').doc(inputId.value).update({
                    ...formData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showToast("Item updated!");
            } else {
                const now = new Date();
                formData.Status = 'Active';
                formData.Initial_Qty = qtyNum;
                formData.usedCount = 0;
                formData.history = [{
                    date: now.toISOString(),
                    displayDate: formatDisplayTime(now),
                    action: 'create',
                    amount: qtyNum,
                    note: `นำเข้าตู้เย็น ${qtyNum} ${unitVal} (ซื้อเมื่อ ${purchaseVal})`
                }];
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

function formatDisplayTime(date) {
    const d = new Date(date);
    const day = d.getDate();
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${hours}:${mins} น.`;
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
    
    const todayStr = getFormattedDate(new Date());
    inputPurchase.value = todayStr;
    inputExpiry.value = todayStr;
    
    populateUnitSelect();
    
    // Deselect all chips
    inputCategory.value = '';
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.add('bg-gray-100', 'text-gray-700');
        chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
    });
}
