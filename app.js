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

// --- Security / Family Authentication ---
// Authenticated dynamically via Firestore settings/security (Zero secrets in Public Git)
let securityPinCache = null;

async function getSecurityPin() {
    if (securityPinCache) return securityPinCache;
    try {
        const doc = await db.collection('settings').doc('security').get();
        if (doc.exists && doc.data() && doc.data().pin) {
            securityPinCache = String(doc.data().pin).trim();
            return securityPinCache;
        }
    } catch (err) {
        console.warn("Security PIN check notice:", err);
    }
    return null;
}

// --- Discrete Units Definition ---
const DISCRETE_UNITS = ['ชิ้น', 'กล่อง', 'ขวด', 'ถุง', 'ฟอง', 'แพ็ค', 'ห่อ', 'จาน', 'มัด', 'ลูก', 'หัว', 'กระป๋อง'];

function isDiscreteUnit(unit) {
    return DISCRETE_UNITS.includes(unit);
}

// --- State ---
let inventory = [];        // Active & Low items
let allInventory = [];     // All items including Depleted (for full history)
const DEFAULT_UNITS = ['ชิ้น', 'กล่อง', 'ขวด', 'ถุง', 'ฟอง', 'แพ็ค', 'กรัม', 'กก.', 'จาน', 'ห่อ', 'มล.'];
let units = [...DEFAULT_UNITS];
let currentConsumeItem = null;
let currentTab = 'inventory'; // 'inventory' | 'history'

// --- DOM Elements ---
const pinLockScreen = document.getElementById('pinLockScreen');
const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');

// Tab Elements
const tabInventoryBtn = document.getElementById('tabInventoryBtn');
const tabHistoryBtn = document.getElementById('tabHistoryBtn');
const inventorySection = document.getElementById('inventorySection');
const historySection = document.getElementById('historySection');
const badgeActiveCount = document.getElementById('badgeActiveCount');
const badgeHistoryCount = document.getElementById('badgeHistoryCount');
const historyFeedContainer = document.getElementById('historyFeedContainer');
const historyEmptyState = document.getElementById('historyEmptyState');

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

// AI Chef & Key Modal Elements
const aiChefBtn = document.getElementById('aiChefBtn');
const aiChefModal = document.getElementById('aiChefModal');
const closeAiChefModalBtn = document.getElementById('closeAiChefModalBtn');
const aiSettingsBtn = document.getElementById('aiSettingsBtn');
const aiChefContent = document.getElementById('aiChefContent');
const aiChefFooter = document.getElementById('aiChefFooter');
const reGenerateAiBtn = document.getElementById('reGenerateAiBtn');
const closeAiChefFooterBtn = document.getElementById('closeAiChefFooterBtn');

const aiKeyModal = document.getElementById('aiKeyModal');
const closeAiKeyModalBtn = document.getElementById('closeAiKeyModalBtn');
const aiApiKeyInput = document.getElementById('aiApiKeyInput');
const toggleAiKeyVisibilityBtn = document.getElementById('toggleAiKeyVisibilityBtn');
const toggleAiKeyIcon = document.getElementById('toggleAiKeyIcon');
const saveAiKeyBtn = document.getElementById('saveAiKeyBtn');
const saveAiKeySpinner = document.getElementById('saveAiKeySpinner');
const aiKeyStatusBanner = document.getElementById('aiKeyStatusBanner');
const clearAiKeyBtn = document.getElementById('clearAiKeyBtn');

// AI State
let aiApiKeyCache = null;
let cachedAiRecipes = null;
let isGeneratingAi = false;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    checkFamilyPinAuth();
    setupEventListeners();
    setupTabNavigation();
    setupAiEventListeners();
    
    // Set default dates to today
    const todayStr = getFormattedDate(new Date());
    if (inputPurchase) inputPurchase.value = todayStr;
    if (inputExpiry) inputExpiry.value = todayStr;
});

// --- Family PIN Authentication ---

function checkFamilyPinAuth() {
    const isAuth = localStorage.getItem('tooyenkung_pin_auth') === 'true';
    if (isAuth) {
        if (pinLockScreen) pinLockScreen.classList.add('hidden');
        startRealtimeListeners();
    } else {
        if (pinLockScreen) {
            pinLockScreen.classList.remove('hidden');
            if (pinInput) pinInput.focus();
        }
    }
}

if (pinForm) {
    pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entered = pinInput ? pinInput.value.trim() : '';
        if (!entered) return;

        const submitBtn = pinForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const correctPin = await getSecurityPin();
            if (correctPin && entered === correctPin) {
                localStorage.setItem('tooyenkung_pin_auth', 'true');
                if (pinLockScreen) pinLockScreen.classList.add('hidden');
                if (pinError) pinError.classList.add('hidden');
                startRealtimeListeners();
            } else {
                if (pinError) pinError.classList.remove('hidden');
                if (pinInput) {
                    pinInput.value = '';
                    pinInput.focus();
                }
            }
        } catch (err) {
            console.error("PIN authentication check error:", err);
            if (pinError) pinError.classList.remove('hidden');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

function startRealtimeListeners() {
    listenToUnits();
    listenToInventory();
}

// --- Tab Switching Logic ---

function setupTabNavigation() {
    if (tabInventoryBtn) tabInventoryBtn.addEventListener('click', () => switchTab('inventory'));
    if (tabHistoryBtn) tabHistoryBtn.addEventListener('click', () => switchTab('history'));
}

function switchTab(tab) {
    currentTab = tab;
    if (tab === 'inventory') {
        if (tabInventoryBtn) tabInventoryBtn.className = "flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-blue-600 bg-white shadow-xs transition-all flex items-center justify-center";
        if (tabHistoryBtn) tabHistoryBtn.className = "flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center bg-transparent";
        if (inventorySection) inventorySection.classList.remove('hidden');
        if (historySection) historySection.classList.add('hidden');
        if (openAddModalBtn) openAddModalBtn.classList.remove('hidden');
    } else {
        if (tabHistoryBtn) tabHistoryBtn.className = "flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-blue-600 bg-white shadow-xs transition-all flex items-center justify-center";
        if (tabInventoryBtn) tabInventoryBtn.className = "flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-all flex items-center justify-center bg-transparent";
        if (inventorySection) inventorySection.classList.add('hidden');
        if (historySection) historySection.classList.remove('hidden');
        if (openAddModalBtn) openAddModalBtn.classList.add('hidden');
        renderHistoryFeed();
    }
}

// --- Realtime Database Listeners (Firestore) ---

function listenToInventory() {
    showLoading(true);
    db.collection('inventory').onSnapshot((snapshot) => {
        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const activeItems = [];
            const rawAll = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                const itemObj = {
                    ID: doc.id,
                    id: doc.id,
                    ...data
                };
                rawAll.push(itemObj);

                // Filter active/low items
                if (data.Status !== 'Depleted') {
                    const expiryDate = new Date(data.Expiry_Date);
                    const diffTime = expiryDate - now;
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    activeItems.push({
                        ...itemObj,
                        daysLeft
                    });
                }
            });

            // Sort items by Expiry_Date (closest expiry first)
            activeItems.sort((a, b) => new Date(a.Expiry_Date) - new Date(b.Expiry_Date));
            inventory = activeItems;
            allInventory = rawAll;

            // Update badge counts safely
            if (badgeActiveCount) badgeActiveCount.textContent = inventory.length;

            renderItems();
            renderHistoryFeed();
        } catch (err) {
            console.error("Error processing inventory snapshot:", err);
        } finally {
            // Guaranteed to hide loading indicator
            showLoading(false);
        }
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
        if (inputUnit) populateUnitSelect(inputUnit.value);
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
    if (!inputUnit) return;
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

// --- Modal Management (Locks Background Scrolling & Prevents Left-Right Panning) ---

function showModal(modalElem) {
    if (!modalElem) return;
    modalElem.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function hideModal(modalElem) {
    if (!modalElem) return;
    modalElem.classList.add('hidden');
    const hasOpenModal = [itemModal, consumeModal, unitsModal, aiChefModal, aiKeyModal].some(m => m && !m.classList.contains('hidden'));
    if (!hasOpenModal) {
        document.body.classList.remove('modal-open');
    }
}

function openUnitsModal() {
    renderUnitsList();
    if (newUnitInput) newUnitInput.value = '';
    showModal(unitsModal);
    setTimeout(() => newUnitInput && newUnitInput.focus(), 150);
}

function renderUnitsList() {
    if (!unitsListContainer) return;
    unitsListContainer.innerHTML = '';
    
    if (units.length === 0) {
        unitsListContainer.innerHTML = '<p class="text-gray-400 text-sm py-2">ไม่มีหน่วยนับ</p>';
        return;
    }
    
    units.forEach((u) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100';
        row.innerHTML = `
            <span class="font-bold text-gray-800 text-sm">${u}</span>
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
    if (!newUnitInput) return;
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

// --- UI Rendering: Inventory Cards (Comfortable Width, Never Squeezed) ---

function renderItems() {
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '';
    
    if (inventory.length === 0) {
        itemsContainer.classList.add('hidden');
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.style.display = 'flex';
        }
        return;
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
        emptyState.classList.add('hidden');
    }
    itemsContainer.classList.remove('hidden');
    
    inventory.forEach(item => {
        // Expiry color badge
        let colorClass = "bg-green-100 text-green-800 border-green-200";
        let icon = "fa-check-circle text-green-500";
        let statusText = `${item.daysLeft} วัน`;
        
        if (item.daysLeft <= 0) {
            colorClass = "bg-red-100 text-red-800 border-red-200";
            icon = "fa-triangle-exclamation text-red-500";
            statusText = item.daysLeft < 0 ? `หมดอายุ ${Math.abs(item.daysLeft)} วันก่อน` : "หมดอายุวันนี้!";
        } else if (item.daysLeft <= 2) {
            colorClass = "bg-red-100 text-red-800 border-red-200";
            icon = "fa-triangle-exclamation text-red-500";
            statusText = `เหลือ ${item.daysLeft} วัน`;
        } else if (item.daysLeft <= 5) {
            colorClass = "bg-orange-100 text-orange-800 border-orange-200";
            icon = "fa-clock text-orange-500";
            statusText = `เหลือ ${item.daysLeft} วัน`;
        } else {
            statusText = `เหลือ ${item.daysLeft} วัน`;
        }
        
        const usedCount = item.usedCount || 0;
        
        const card = document.createElement('div');
        card.className = `bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow`;
        card.innerHTML = `
            <div>
                <!-- Top Header: Item Name, Edit Button & Expiry Badge -->
                <div class="flex justify-between items-start mb-2">
                    <div class="pr-2 min-w-0 flex-1">
                        <div class="flex items-center space-x-1.5">
                            <h3 class="font-bold text-lg sm:text-xl text-gray-800 leading-tight truncate" title="${item.Item_Name}">${item.Item_Name}</h3>
                            <button type="button" onclick="editItem('${item.ID}')" class="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0" title="แก้ไขข้อมูล">
                                <i class="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                        </div>
                        <p class="text-xs text-gray-400 mt-0.5">${item.Category || 'ทั่วไป'}</p>
                    </div>
                    <div class="${colorClass} px-2.5 py-1 rounded-full text-xs font-bold border flex items-center shadow-xs flex-shrink-0 whitespace-nowrap">
                        <i class="fa-solid ${icon} mr-1"></i>
                        ${statusText}
                    </div>
                </div>

                <!-- Purchase Date Info -->
                <div class="text-xs text-gray-500 font-medium flex items-center my-2 whitespace-nowrap">
                    <i class="fa-solid fa-cart-shopping mr-1.5 text-blue-500"></i>ซื้อเมื่อ: <span class="font-semibold text-gray-700 ml-1">${item.Purchase_Date || '-'}</span>
                </div>
            </div>
            
            <div class="mt-2">
                <!-- Quantity & Stock Display -->
                <div class="bg-gray-50/90 px-3.5 py-3 rounded-2xl border border-gray-100 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <span class="text-[11px] font-semibold text-gray-400 block whitespace-nowrap">คงเหลือในตู้:</span>
                        <div class="text-xl sm:text-2xl font-black text-gray-800 leading-none mt-0.5 whitespace-nowrap">
                            ${item.Remaining_Qty} <span class="text-xs font-medium text-gray-500">${item.Unit}</span>
                        </div>
                    </div>
                    
                    ${usedCount > 0 ? `
                        <div class="bg-orange-50 border border-orange-200/60 px-2.5 py-1.5 rounded-xl text-right flex-shrink-0">
                            <span class="text-[10px] text-orange-600/80 block font-medium">ใช้ไปแล้ว</span>
                            <span class="text-xs font-bold text-orange-700 whitespace-nowrap">${usedCount} ${item.Unit}</span>
                        </div>
                    ` : `
                        <div class="text-right flex-shrink-0">
                            <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 flex items-center">
                                <i class="fa-solid fa-circle-check text-[10px] mr-1"></i>พร้อมใช้
                            </span>
                        </div>
                    `}
                </div>
                
                <!-- Main Action Buttons: "ใช้" and "ใช้หมดแล้ว" -->
                <div class="flex items-center space-x-2 pt-3 mt-2 border-t border-gray-100">
                    <button type="button" onclick="openConsumeModal('${item.ID}')" class="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs flex items-center justify-center active:bg-blue-800 transition-all" title="บันทึกการใช้">
                        <i class="fa-solid fa-utensils mr-2 text-xs"></i>ใช้
                    </button>
                    <button type="button" onclick="markDepleted('${item.ID}')" class="py-2.5 px-3.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl text-xs sm:text-sm font-bold border border-gray-200/80 hover:border-red-200 flex items-center justify-center active:bg-red-100 transition-all whitespace-nowrap" title="บันทึกว่าใช้หมดแล้ว">
                        <i class="fa-solid fa-check-double mr-1.5 text-xs text-gray-400"></i>ใช้หมดแล้ว
                    </button>
                </div>
            </div>
        `;
        itemsContainer.appendChild(card);
    });
}

// --- UI Rendering: Dedicated History Tab Feed ---

function renderHistoryFeed() {
    if (!historyFeedContainer) return;
    
    // Compile history logs across ALL items (including depleted items)
    const allLogs = [];
    
    allInventory.forEach(item => {
        if (Array.isArray(item.history)) {
            item.history.forEach(log => {
                allLogs.push({
                    ...log,
                    itemId: item.ID,
                    itemName: item.Item_Name,
                    category: item.Category,
                    unit: item.Unit,
                    purchaseDate: item.Purchase_Date,
                    timestamp: log.date ? new Date(log.date).getTime() : 0
                });
            });
        }
    });

    // Update history badge count safely
    if (badgeHistoryCount) badgeHistoryCount.textContent = allLogs.length;

    if (allLogs.length === 0) {
        historyFeedContainer.classList.add('hidden');
        if (historyEmptyState) {
            historyEmptyState.classList.remove('hidden');
            historyEmptyState.style.display = 'flex';
        }
        return;
    }

    if (historyEmptyState) {
        historyEmptyState.style.display = 'none';
        historyEmptyState.classList.add('hidden');
    }
    historyFeedContainer.classList.remove('hidden');
    historyFeedContainer.innerHTML = '';

    // Sort newest first
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    allLogs.forEach(log => {
        const isCreate = log.action === 'create';
        const isDeplete = log.action === 'deplete';

        let badgeBg = 'bg-orange-100 text-orange-700 border-orange-200';
        let icon = 'fa-utensils';
        let actionLabel = 'หยิบใช้';

        if (isCreate) {
            badgeBg = 'bg-blue-100 text-blue-700 border-blue-200';
            icon = 'fa-cart-plus';
            actionLabel = 'นำเข้าตู้';
        } else if (isDeplete) {
            badgeBg = 'bg-gray-100 text-gray-700 border-gray-200';
            icon = 'fa-trash';
            actionLabel = 'ใช้หมดแล้ว';
        }

        const logIdentifier = log.id || log.date || '';

        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:shadow-sm transition-shadow flex items-start space-x-3.5';
        card.innerHTML = `
            <div class="${badgeBg} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm border mt-0.5">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-gray-800 text-base leading-tight truncate mr-2">${log.itemName}</h4>
                    <div class="flex items-center space-x-1.5 flex-shrink-0">
                        <span class="text-[11px] text-gray-400 whitespace-nowrap">${log.displayDate || getFormattedDate(log.date)}</span>
                        <button type="button" onclick="deleteHistoryEntry('${log.itemId}', '${logIdentifier}')" class="text-gray-300 hover:text-red-500 hover:bg-red-50 w-7 h-7 flex items-center justify-center rounded-lg transition-colors ml-1" title="ลบประวัตินี้">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                    หมวด: <span class="font-medium text-gray-700">${log.category || 'ทั่วไป'}</span>
                </div>
                <div class="text-xs font-semibold text-gray-700 mt-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    ${log.note || `${actionLabel} ${log.amount || ''} ${log.unit || ''}`}
                </div>
            </div>
        `;
        historyFeedContainer.appendChild(card);
    });
}

// --- History Deletion Logic ---

async function deleteHistoryEntry(itemId, logIdentifier) {
    const item = allInventory.find(i => i.ID === itemId);
    if (!item) {
        showToast("ไม่พบข้อมูลวัตถุดิบนี้");
        return;
    }

    const log = (item.history || []).find(h => (h.id && h.id === logIdentifier) || h.date === logIdentifier);
    if (!log) {
        showToast("ไม่พบรายการประวัตินี้");
        return;
    }

    let confirmMsg = `ต้องการลบประวัตินี้ใช่หรือไม่?\n\n"${log.itemName}"\n${log.note || ''}`;
    let shouldRestoreQty = false;

    // If it was a consumption on an active item, offer to restore stock automatically
    if (log.action === 'consume' && log.amount && item.Status !== 'Depleted') {
        confirmMsg += `\n\n(ระบบจะคืนสต็อก ${log.amount} ${item.Unit || ''} กลับเข้าตู้เย็นให้อัตโนมัติ)`;
        shouldRestoreQty = true;
    }

    if (!confirm(confirmMsg)) return;

    try {
        const updatedHistory = (item.history || []).filter(h => !((h.id && h.id === logIdentifier) || h.date === logIdentifier));
        const updateData = {
            history: updatedHistory,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (shouldRestoreQty) {
            const currentQty = parseFloat(item.Remaining_Qty) || 0;
            const newQty = Math.round((currentQty + parseFloat(log.amount)) * 100) / 100;
            const currentUsed = parseFloat(item.usedCount) || 0;
            const newUsed = Math.max(0, Math.round((currentUsed - parseFloat(log.amount)) * 100) / 100);

            updateData.Remaining_Qty = newQty;
            updateData.usedCount = newUsed;

            item.Remaining_Qty = newQty;
            item.usedCount = newUsed;
        }

        item.history = updatedHistory;
        renderHistoryFeed();
        renderItems();
        showToast("ลบประวัติเรียบร้อยแล้ว");

        await db.collection('inventory').doc(itemId).update(updateData);
    } catch (err) {
        console.error("Error deleting history entry:", err);
        showToast("เกิดข้อผิดพลาดในการลบประวัติ");
    }
}

// --- Consumption Logic ---

function quickConsumeOne(id) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;
    executeConsumption(item, 1, `หยิบใช้ 1 ${item.Unit}`);
}

function openConsumeModal(id) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;

    currentConsumeItem = item;
    if (consumeItemId) consumeItemId.value = item.ID;
    if (consumeItemTitle) consumeItemTitle.textContent = `หยิบใช้: ${item.Item_Name}`;
    if (consumeCurrentStockText) consumeCurrentStockText.textContent = `คงเหลือปัจจุบัน: ${item.Remaining_Qty} ${item.Unit}`;
    if (consumeUnitLabel) consumeUnitLabel.textContent = item.Unit;
    if (consumeUnitSuffix) consumeUnitSuffix.textContent = item.Unit;
    
    // Default volume is 1 (or remaining if remaining < 1)
    const remaining = parseFloat(item.Remaining_Qty) || 0;
    let defaultAmount = 1;
    if (remaining < 1 && remaining > 0) {
        defaultAmount = remaining;
    }

    if (consumeAmountInput) consumeAmountInput.value = defaultAmount;
    if (consumeNoteInput) consumeNoteInput.value = '';
    updateConsumePreview(defaultAmount);

    renderConsumePresets(item);

    showModal(consumeModal);
    setTimeout(() => {
        if (consumeAmountInput) {
            consumeAmountInput.focus();
            consumeAmountInput.select();
        }
    }, 150);
}

function renderConsumePresets(item) {
    if (!consumePresetsContainer) return;
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
        presets = [1, 2, 3, 4, 5].filter(val => val < remaining);
    }

    presets.forEach(p => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-3 py-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 font-bold rounded-xl text-xs active:bg-blue-200 transition-colors';
        btn.textContent = `${p} ${unit}`;
        btn.onclick = () => {
            if (consumeAmountInput) {
                consumeAmountInput.value = p;
                updateConsumePreview(p);
            }
        };
        consumePresetsContainer.appendChild(btn);
    });

    if (remaining > 1) {
        const half = Math.round((remaining / 2) * 10) / 10;
        const halfBtn = document.createElement('button');
        halfBtn.type = 'button';
        halfBtn.className = 'px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-xl text-xs active:bg-blue-200 transition-colors';
        halfBtn.textContent = `ครึ่งหนึ่ง (${half} ${unit})`;
        halfBtn.onclick = () => {
            if (consumeAmountInput) {
                consumeAmountInput.value = half;
                updateConsumePreview(half);
            }
        };
        consumePresetsContainer.appendChild(halfBtn);
    }

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'px-3 py-1.5 bg-orange-50 text-orange-700 font-bold rounded-xl text-xs active:bg-orange-200 transition-colors';
    allBtn.textContent = `ทั้งหมด (${remaining} ${unit})`;
    allBtn.onclick = () => {
        if (consumeAmountInput) {
            consumeAmountInput.value = remaining;
            updateConsumePreview(remaining);
        }
    };
    consumePresetsContainer.appendChild(allBtn);
}

function updateConsumePreview(enteredAmount) {
    if (!currentConsumeItem || !consumePreviewRemaining) return;
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
    const logId = 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const historyEntry = {
        id: logId,
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
    renderHistoryFeed();
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

// --- Interactions ---

async function markDepleted(id) {
    if (!confirm("ยืนยันว่าใช้ของชิ้นนี้หมดแล้วใช่หรือไม่?")) return;
    
    const backupItem = inventory.find(i => i.ID === id);
    inventory = inventory.filter(i => i.ID !== id);
    renderItems();
    showToast("นำออกจากตู้เย็นแล้ว");
    
    try {
        const now = new Date();
        const logId = 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const depleteEntry = {
            id: logId,
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
        showToast("ไม่สามารถอัปเดตได้");
        if (backupItem) {
            inventory.push(backupItem);
            renderItems();
        }
    }
}

function editItem(id) {
    const item = inventory.find(i => i.ID === id);
    if (!item) return;
    
    if (modalTitle) modalTitle.textContent = "แก้ไขข้อมูล";
    if (inputId) inputId.value = item.ID;
    if (inputName) inputName.value = item.Item_Name;
    if (inputQty) inputQty.value = item.Remaining_Qty;
    
    populateUnitSelect(item.Unit);
    
    if (inputPurchase) {
        inputPurchase.value = item.Purchase_Date || getFormattedDate(new Date());
    }

    if (inputExpiry && item.Expiry_Date) {
        const d = new Date(item.Expiry_Date);
        inputExpiry.value = getFormattedDate(d);
    }
    
    selectCategoryChip(item.Category);
    showModal(itemModal);
}

// --- Event Listeners ---

function setupEventListeners() {
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            showToast("กำลังรีโหลดแอป...");
            setTimeout(() => {
                window.location.reload();
            }, 250);
        });
    }
    
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            resetForm();
            if (modalTitle) modalTitle.textContent = "Add to Fridge";
            populateUnitSelect();
            showModal(itemModal);
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            hideModal(itemModal);
        });
    }

    if (closeConsumeModalBtn) {
        closeConsumeModalBtn.addEventListener('click', () => {
            hideModal(consumeModal);
            currentConsumeItem = null;
        });
    }

    // Live preview when typing amount to use
    if (consumeAmountInput) {
        consumeAmountInput.addEventListener('input', () => {
            updateConsumePreview(consumeAmountInput.value);
        });
    }

    // Consume form submit
    if (consumeForm) {
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

            const note = consumeNoteInput ? consumeNoteInput.value.trim() : '';
            const noteText = note 
                ? `หยิบใช้ ${amount} ${currentConsumeItem.Unit} (${note})` 
                : `หยิบใช้ ${amount} ${currentConsumeItem.Unit}`;

            hideModal(consumeModal);
            executeConsumption(currentConsumeItem, amount, noteText);
            currentConsumeItem = null;
        });
    }
    
    // Unit modal triggers
    if (manageUnitsBtn) {
        manageUnitsBtn.addEventListener('click', () => {
            openUnitsModal();
        });
    }
    
    if (closeUnitsModalBtn) {
        closeUnitsModalBtn.addEventListener('click', () => {
            hideModal(unitsModal);
        });
    }

    // Backdrop click to close modals
    [itemModal, consumeModal, unitsModal, aiChefModal, aiKeyModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideModal(modal);
                }
            });
        }
    });
    
    if (addNewUnitBtn) {
        addNewUnitBtn.addEventListener('click', () => {
            addNewUnit();
        });
    }
    
    if (newUnitInput) {
        newUnitInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addNewUnit();
            }
        });
    }
    
    if (inputUnit) {
        inputUnit.addEventListener('change', () => {
            if (inputUnit.value === '__ADD_NEW__') {
                openUnitsModal();
            }
        });
    }
    
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
            const days = parseInt(btn.getAttribute('data-days'));
            const baseDate = (inputPurchase && inputPurchase.value) ? new Date(inputPurchase.value) : new Date();
            baseDate.setDate(baseDate.getDate() + days);
            if (inputExpiry) inputExpiry.value = getFormattedDate(baseDate);
        });
    });
    
    // Form Submit (Save to Firestore)
    if (itemForm) {
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const isUpdate = !!(inputId && inputId.value);
            const submitText = saveItemBtn ? saveItemBtn.querySelector('span') : null;
            if (submitText) submitText.textContent = "Saving...";
            if (saveSpinner) saveSpinner.classList.remove('hidden');
            if (saveItemBtn) saveItemBtn.disabled = true;
            
            const qtyNum = parseFloat(inputQty.value) || 1;
            const unitVal = inputUnit ? inputUnit.value || 'ชิ้น' : 'ชิ้น';
            const purchaseVal = (inputPurchase && inputPurchase.value) ? inputPurchase.value : getFormattedDate(new Date());

            const formData = {
                Item_Name: inputName ? inputName.value.trim() : 'วัตถุดิบ',
                Category: inputCategory ? inputCategory.value || 'อื่นๆ' : 'อื่นๆ',
                Remaining_Qty: qtyNum,
                Unit: unitVal,
                Purchase_Date: purchaseVal,
                Expiry_Date: inputExpiry ? inputExpiry.value : getFormattedDate(new Date())
            };
            
            try {
                if (isUpdate) {
                    await db.collection('inventory').doc(inputId.value).update({
                        ...formData,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showToast("แก้ไขข้อมูลเรียบร้อย!");
                } else {
                    const now = new Date();
                    const logId = 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
                    formData.Status = 'Active';
                    formData.Initial_Qty = qtyNum;
                    formData.usedCount = 0;
                    formData.history = [{
                        id: logId,
                        date: now.toISOString(),
                        displayDate: formatDisplayTime(now),
                        action: 'create',
                        amount: qtyNum,
                        note: `นำเข้าตู้เย็น ${qtyNum} ${unitVal} (ซื้อเมื่อ ${purchaseVal})`
                    }];
                    formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    formData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                    
                    await db.collection('inventory').add(formData);
                    showToast("บันทึกเข้าตู้เย็นแล้ว!");
                }
                
                hideModal(itemModal);
            } catch (error) {
                console.error("Error saving to Firestore:", error);
                showToast("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
            } finally {
                if (submitText) submitText.textContent = "Save to Fridge";
                if (saveSpinner) saveSpinner.classList.add('hidden');
                if (saveItemBtn) saveItemBtn.disabled = false;
                // Guaranteed safety: loading indicator is ALWAYS hidden
                showLoading(false);
            }
        });
    }
}

// --- Helpers ---

function showLoading(show) {
    if (!loadingIndicator) return;
    if (show) {
        loadingIndicator.style.display = 'flex';
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.style.display = 'none';
        loadingIndicator.classList.add('hidden');
    }
}

function showToast(message) {
    if (!toast) return;
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
    if (inputCategory) inputCategory.value = val;
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
    if (inputId) inputId.value = '';
    if (inputName) inputName.value = '';
    if (inputQty) inputQty.value = '1';
    
    const todayStr = getFormattedDate(new Date());
    if (inputPurchase) inputPurchase.value = todayStr;
    if (inputExpiry) inputExpiry.value = todayStr;
    
    populateUnitSelect();
    
    // Deselect all chips
    if (inputCategory) inputCategory.value = '';
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.add('bg-gray-100', 'text-gray-700');
        chip.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
    });
}

// =========================================================================
// --- AI Chef Feature (Gemini API • Thai & Japanese Recipe Suggestions) ---
// =========================================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- Dynamic Firestore AI API Key Management (Zero secrets in Public Git) ---

async function getAiApiKey() {
    if (aiApiKeyCache) return aiApiKeyCache;
    try {
        const doc = await db.collection('settings').doc('ai_config').get();
        if (doc.exists && doc.data() && doc.data().apiKey) {
            aiApiKeyCache = String(doc.data().apiKey).trim();
            return aiApiKeyCache;
        }
    } catch (err) {
        console.warn("AI API Key fetch notice:", err);
    }
    return null;
}

async function saveAiApiKey(key) {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) throw new Error("กรุณากรอก API Key");
    await db.collection('settings').doc('ai_config').set({
        apiKey: cleanKey,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    aiApiKeyCache = cleanKey;
}

async function deleteAiApiKey() {
    await db.collection('settings').doc('ai_config').delete();
    aiApiKeyCache = null;
    cachedAiRecipes = null;
}

// --- Setup AI Event Listeners ---

function setupAiEventListeners() {
    // Open AI Chef
    if (aiChefBtn) {
        aiChefBtn.addEventListener('click', handleAiChefClick);
    }

    // Modal Close buttons
    if (closeAiChefModalBtn) {
        closeAiChefModalBtn.addEventListener('click', () => hideModal(aiChefModal));
    }
    if (closeAiChefFooterBtn) {
        closeAiChefFooterBtn.addEventListener('click', () => hideModal(aiChefModal));
    }

    // AI Settings Button (Gear)
    if (aiSettingsBtn) {
        aiSettingsBtn.addEventListener('click', openAiKeyModal);
    }

    // Re-generate Recipes
    if (reGenerateAiBtn) {
        reGenerateAiBtn.addEventListener('click', () => generateAiRecipes(true));
    }

    // AI Key Modal handlers
    if (closeAiKeyModalBtn) {
        closeAiKeyModalBtn.addEventListener('click', () => hideModal(aiKeyModal));
    }

    if (toggleAiKeyVisibilityBtn && aiApiKeyInput && toggleAiKeyIcon) {
        toggleAiKeyVisibilityBtn.addEventListener('click', () => {
            if (aiApiKeyInput.type === 'password') {
                aiApiKeyInput.type = 'text';
                toggleAiKeyIcon.classList.remove('fa-eye');
                toggleAiKeyIcon.classList.add('fa-eye-slash');
            } else {
                aiApiKeyInput.type = 'password';
                toggleAiKeyIcon.classList.remove('fa-eye-slash');
                toggleAiKeyIcon.classList.add('fa-eye');
            }
        });
    }

    if (saveAiKeyBtn) {
        saveAiKeyBtn.addEventListener('click', async () => {
            const keyVal = aiApiKeyInput ? aiApiKeyInput.value.trim() : '';
            if (!keyVal) {
                showToast("กรุณากรอก Gemini API Key");
                return;
            }

            const btnText = saveAiKeyBtn.querySelector('span');
            if (btnText) btnText.textContent = "กำลังบันทึก...";
            if (saveAiKeySpinner) saveAiKeySpinner.classList.remove('hidden');
            saveAiKeyBtn.disabled = true;

            try {
                await saveAiApiKey(keyVal);
                showToast("บันทึก Gemini API Key เรียบร้อย! 🎉");
                hideModal(aiKeyModal);
                
                // If AI Chef modal was open or initiated, run recipe generation
                const activeItems = inventory.filter(i => i.Status !== 'Depleted' && parseFloat(i.Remaining_Qty) > 0);
                if (activeItems.length > 0) {
                    showModal(aiChefModal);
                    generateAiRecipes(false);
                }
            } catch (err) {
                console.error("Save AI key error:", err);
                showToast("บันทึก API Key ไม่สำเร็จ: " + (err.message || "ลองใหม่อีกครั้ง"));
            } finally {
                if (btnText) btnText.textContent = "บันทึก API Key";
                if (saveAiKeySpinner) saveAiKeySpinner.classList.add('hidden');
                saveAiKeyBtn.disabled = false;
            }
        });
    }

    if (clearAiKeyBtn) {
        clearAiKeyBtn.addEventListener('click', async () => {
            if (confirm("ต้องการลบ Gemini API Key ออกจากระบบครอบครัวใช่หรือไม่?")) {
                try {
                    await deleteAiApiKey();
                    if (aiApiKeyInput) aiApiKeyInput.value = '';
                    if (aiKeyStatusBanner) aiKeyStatusBanner.classList.add('hidden');
                    showToast("ลบ API Key เรียบร้อยแล้ว");
                } catch (err) {
                    showToast("เกิดข้อผิดพลาดในการลบคีย์");
                }
            }
        });
    }

    // Event delegation inside aiChefContent
    if (aiChefContent) {
        aiChefContent.addEventListener('click', (e) => {
            // Copy shopping list button
            const copyBtn = e.target.closest('.copy-shopping-btn');
            if (copyBtn) {
                const idx = parseInt(copyBtn.getAttribute('data-recipe-idx'), 10);
                if (cachedAiRecipes && cachedAiRecipes.recipes && cachedAiRecipes.recipes[idx]) {
                    copyShoppingList(cachedAiRecipes.recipes[idx]);
                }
                return;
            }

            // Retry button
            const retryBtn = e.target.closest('#aiRetryBtn');
            if (retryBtn) {
                generateAiRecipes(true);
                return;
            }

            // Edit key button from error
            const editKeyBtn = e.target.closest('#aiKeyEditFromErrBtn');
            if (editKeyBtn) {
                openAiKeyModal();
                return;
            }

            // Add item button from empty fridge
            const addBtn = e.target.closest('#aiCloseAndAddBtn');
            if (addBtn) {
                hideModal(aiChefModal);
                if (openAddModalBtn) openAddModalBtn.click();
                return;
            }
        });
    }
}

async function openAiKeyModal() {
    const currentKey = await getAiApiKey();
    if (currentKey) {
        if (aiKeyStatusBanner) {
            aiKeyStatusBanner.classList.remove('hidden');
            const masked = currentKey.length > 8 
                ? currentKey.substring(0, 6) + '••••••••' + currentKey.substring(currentKey.length - 4)
                : '••••••••';
            const statusSpan = aiKeyStatusBanner.querySelector('span');
            if (statusSpan) {
                statusSpan.innerHTML = `<i class="fa-solid fa-circle-check mr-1.5 text-green-500"></i>ตั้งค่าแล้ว (${masked})`;
            }
        }
        if (aiApiKeyInput) aiApiKeyInput.value = currentKey;
    } else {
        if (aiKeyStatusBanner) aiKeyStatusBanner.classList.add('hidden');
        if (aiApiKeyInput) aiApiKeyInput.value = '';
    }
    showModal(aiKeyModal);
    setTimeout(() => {
        if (aiApiKeyInput && !currentKey) aiApiKeyInput.focus();
    }, 150);
}

async function handleAiChefClick() {
    const activeItems = inventory.filter(i => i.Status !== 'Depleted' && parseFloat(i.Remaining_Qty) > 0);
    if (activeItems.length === 0) {
        showModal(aiChefModal);
        renderAiEmptyFridge();
        return;
    }

    const key = await getAiApiKey();
    if (!key) {
        openAiKeyModal();
        return;
    }

    showModal(aiChefModal);
    if (!cachedAiRecipes) {
        generateAiRecipes(false);
    } else {
        renderAiRecipes(cachedAiRecipes);
    }
}

// --- Prompt Builder & Gemini API Execution ---

function buildAiPrompt(activeInventory) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort items by expiry date (near expiry first)
    const sortedItems = [...activeInventory].sort((a, b) => {
        return new Date(a.Expiry_Date || '2099-01-01') - new Date(b.Expiry_Date || '2099-01-01');
    });

    const itemsSummary = sortedItems.map(item => {
        const exp = new Date(item.Expiry_Date || today);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.round((exp - today) / (1000 * 60 * 60 * 24));
        let urgency = "";
        if (diffDays < 0) urgency = " (⚠️ หมดอายุแล้ว)";
        else if (diffDays === 0) urgency = " (🚨 หมดอายุวันนี้!)";
        else if (diffDays <= 3) urgency = ` (⏳ ใกล้หมดอายุ เหลือ ${diffDays} วัน - ควรนำมาใช้ด่วน)`;
        else urgency = ` (เหลืออีก ${diffDays} วัน)`;

        return `- ${item.Item_Name} (หมวด: ${item.Category || 'ทั่วไป'}, คงเหลือ: ${item.Remaining_Qty} ${item.Unit})${urgency}`;
    }).join('\n');

    return `คุณคือ "AI Chef" ผู้เชี่ยวชาญการทำอาหารไทยและอาหารญี่ปุ่นประจำบ้าน
หน้าที่ของคุณคือออกแบบเมนูอาหาร 2 เมนูที่อร่อย ปรุงง่าย เหมาะสำหรับทำทานในครอบครัว โดยใช้วัตถุดิบที่มีในตู้เย็นเป็นหลัก

นี่คือรายการวัตถุดิบทั้งหมดที่มีในตู้เย็นปัจจุบัน:
${itemsSummary}

ข้อกำหนดและกฎสำคัญ (ต้องปฏิบัติตามอย่างเคร่งครัด):
1. สไตล์อาหาร: เมนูที่แนะนำต้องเป็น "อาหารไทย" (Thai Cuisine) และ/หรือ "อาหารญี่ปุ่น" (Japanese Cuisine) เท่านั้น! (แนะนำ 2 เมนู เช่น อาหารไทย 1 เมนู และ อาหารญี่ปุ่น 1 เมนู หรือทั้ง 2 เมนูตามความเหมาะสมของวัตถุดิบ)
2. วัตถุดิบใกล้หมดอายุ (Zero Waste): ให้ความสำคัญสูงสุดในการนำวัตถุดิบที่ "ใกล้หมดอายุ" มาใช้ปรุงเป็นอันดับแรกเพื่อไม่ให้ของเสียเปล่า
3. กรณีของในตู้ไม่ครบ (สำคัญที่สุด!): หากวัตถุดิบหรือเครื่องปรุงในตู้ไม่ครบ ต้องระบุรายการ "ของที่ต้องซื้อเพิ่ม" (missing_ingredients) โดย **ต้องระบุปริมาณ/หน่วยที่ต้องใช้อย่างละเอียดและชัดเจน** เช่น "โชยุ 2 ช้อนโต๊ะ", "มิริน 1 ช้อนโต๊ะ", "ไข่ไก่ 2 ฟอง", "ต้นหอมญี่ปุ่น 1 ต้น", "น้ำมันหอย 1 ช้อนโต๊ะ" (ห้ามใส่แค่ชื่อวัตถุดิบโดยไม่มีปริมาณเด็ดขาด)
4. วัตถุดิบจากตู้เย็นที่ใช้ (used_ingredients): ระบุว่านำของชิ้นไหนจากในตู้มาใช้ พร้อมปริมาณที่ต้องใช้ เช่น "หมูสันนอก 200 กรัม", "กะหล่ำปลี 1/2 หัว"
5. วิธีทำ (instructions): สรุปขั้นตอนการทำอย่างกระชับ เข้าใจง่าย 3-4 ขั้นตอน มือใหม่ก็ทำตามได้
6. เคล็ดลับเชฟ (chef_tip): คำแนะนำสั้นๆ 1 ประโยคเพื่อให้เมนูนี้อร่อยยิ่งขึ้น

ตอบกลับเป็น JSON เท่านั้น ตามโครงสร้างนี้:
{
  "recipes": [
    {
      "name": "ชื่อเมนูภาษาไทย",
      "cuisine": "อาหารไทย หรือ อาหารญี่ปุ่น",
      "flag": "🇹🇭 หรือ 🇯🇵",
      "description": "คำอธิบายความอร่อยสั้นๆ 1 ประโยค",
      "prep_time": "เช่น 15-20 นาที",
      "difficulty": "ง่าย หรือ ปานกลาง",
      "used_ingredients": [
        { "name": "ชื่อวัตถุดิบในตู้", "amount": "ปริมาณที่ใช้ เช่น 200 กรัม" }
      ],
      "missing_ingredients": [
        { "name": "ชื่อวัตถุดิบ/เครื่องปรุงที่ต้องซื้อเพิ่ม", "amount": "ปริมาณที่ต้องใช้ เช่น 2 ช้อนโต๊ะ" }
      ],
      "instructions": [
        "1. ...",
        "2. ...",
        "3. ..."
      ],
      "chef_tip": "เคล็ดลับเด็ด 1 ประโยค"
    }
  ]
}`;
}

async function callGeminiApi(prompt, apiKey) {
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.7
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP ${response.status}`;
                if (response.status === 404) {
                    console.warn(`Model ${model} not available, trying next fallback...`);
                    lastError = new Error(errMsg);
                    continue;
                }
                throw new Error(errMsg);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("AI ไม่ได้ส่งคำตอบกลับมา ลองใหม่อีกครั้ง");

            const cleanText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(cleanText);
            if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
                throw new Error("รูปแบบข้อมูลเมนูไม่ถูกต้อง");
            }
            return parsed;
        } catch (err) {
            lastError = err;
            if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid'))) {
                throw new Error("Gemini API Key ไม่ถูกต้อง กรุณาตรวจสอบหรือตั้งค่าใหม่");
            }
            if (err.message && err.message.includes('RESOURCE_EXHAUSTED')) {
                throw new Error("โควต้าการใช้งานฟรีเต็มชั่วคราว กรุณารอสักครู่แล้วลองใหม่");
            }
        }
    }
    throw lastError || new Error("ไม่สามารถเชื่อมต่อ Gemini AI ได้");
}

async function generateAiRecipes(isRegenerate = false) {
    if (isGeneratingAi) return;
    isGeneratingAi = true;

    renderAiLoading();

    try {
        const key = await getAiApiKey();
        if (!key) {
            openAiKeyModal();
            return;
        }

        const activeItems = inventory.filter(i => i.Status !== 'Depleted' && parseFloat(i.Remaining_Qty) > 0);
        if (activeItems.length === 0) {
            renderAiEmptyFridge();
            return;
        }

        const prompt = buildAiPrompt(activeItems);
        const result = await callGeminiApi(prompt, key);
        cachedAiRecipes = result;
        renderAiRecipes(result);
    } catch (err) {
        console.error("AI Recipe generation error:", err);
        renderAiError(err.message || "เกิดข้อผิดพลาดในการสร้างเมนู");
    } finally {
        isGeneratingAi = false;
    }
}

// --- Render Helper Functions ---

function renderAiLoading() {
    if (aiChefFooter) aiChefFooter.classList.add('hidden');
    if (!aiChefContent) return;

    aiChefContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center text-3xl mb-4 animate-bounce shadow-xs">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
            </div>
            <h3 class="text-base sm:text-lg font-bold text-gray-800 mb-1">AI Chef กำลังคิดค้นเมนู...</h3>
            <p class="text-xs text-gray-500 max-w-xs leading-relaxed">
                กำลังวิเคราะห์วัตถุดิบใกล้หมดอายุในตู้เย็น และออกแบบเมนูไทย-ญี่ปุ่นสุดอร่อยพร้อมรายการของที่ต้องซื้อเพิ่ม
            </p>
            <div class="mt-5 flex items-center space-x-2 text-xs text-amber-600 font-semibold bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>รอประมาณ 3-5 วินาที</span>
            </div>
        </div>
    `;
}

function renderAiEmptyFridge() {
    if (aiChefFooter) aiChefFooter.classList.add('hidden');
    if (!aiChefContent) return;

    aiChefContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div class="w-16 h-16 bg-gray-100 text-gray-400 rounded-3xl flex items-center justify-center text-3xl mb-4">
                <i class="fa-solid fa-basket-shopping"></i>
            </div>
            <h3 class="text-base font-bold text-gray-800 mb-1">ตู้เย็นยังไม่มีของเลย</h3>
            <p class="text-xs text-gray-500 max-w-xs mb-5">
                กรุณาบันทึกของเข้าตู้เย็นก่อนเรียก AI Chef เพื่อให้ AI วิเคราะห์วัตถุดิบที่มีได้ครับ
            </p>
            <button id="aiCloseAndAddBtn" class="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all">
                <i class="fa-solid fa-plus mr-1.5"></i>เพิ่มของเข้าตู้เย็น
            </button>
        </div>
    `;
}

function renderAiError(message) {
    if (aiChefFooter) aiChefFooter.classList.add('hidden');
    if (!aiChefContent) return;

    const isKeyIssue = message.includes('API Key') || message.includes('key');

    aiChefContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div class="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-xs">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 class="text-base font-bold text-gray-800 mb-1">ไม่สามารถแนะนำเมนูได้</h3>
            <p class="text-xs text-red-500 max-w-xs mb-5 font-medium leading-relaxed">${escapeHtml(message)}</p>
            <div class="flex space-x-2">
                <button id="aiRetryBtn" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all">
                    <i class="fa-solid fa-rotate-right mr-1.5"></i>ลองใหม่อีกครั้ง
                </button>
                ${isKeyIssue ? `
                    <button id="aiKeyEditFromErrBtn" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors">
                        <i class="fa-solid fa-key mr-1.5"></i>แก้ไข API Key
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function renderAiRecipes(data) {
    if (!aiChefContent) return;
    if (aiChefFooter) aiChefFooter.classList.remove('hidden');

    const recipes = data.recipes || [];
    if (recipes.length === 0) {
        renderAiError("AI ไม่พบเมนูที่เหมาะสม ลองใหม่อีกครั้งครับ");
        return;
    }

    let html = `
        <div class="space-y-5">
            <div class="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-200/80 rounded-2xl p-3.5 flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                    <i class="fa-solid fa-kitchen-set"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-bold text-amber-950">AI Chef คิดเมนูสำเร็จแล้ว! (${recipes.length} เมนู)</p>
                    <p class="text-[11px] text-amber-800 truncate">เน้นใช้วัตถุดิบใกล้หมดอายุก่อน พร้อมคำนวณของที่ต้องซื้อเพิ่ม</p>
                </div>
            </div>
    `;

    recipes.forEach((r, idx) => {
        const isJapanese = (r.cuisine && r.cuisine.includes('ญี่ปุ่น')) || (r.flag && r.flag.includes('🇯🇵'));
        const cuisineBadgeClass = isJapanese 
            ? "bg-rose-50 text-rose-700 border-rose-200" 
            : "bg-blue-50 text-blue-700 border-blue-200";
        const cuisineFlag = r.flag || (isJapanese ? "🇯🇵" : "🇹🇭");
        const cuisineTitle = r.cuisine || (isJapanese ? "อาหารญี่ปุ่น" : "อาหารไทย");

        const usedItems = Array.isArray(r.used_ingredients) ? r.used_ingredients : [];
        const missingItems = Array.isArray(r.missing_ingredients) ? r.missing_ingredients : [];
        const instructions = Array.isArray(r.instructions) ? r.instructions : [];

        html += `
            <div class="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 transition-all">
                <!-- Header -->
                <div class="space-y-1.5 border-b border-gray-100 pb-3">
                    <div class="flex justify-between items-start">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cuisineBadgeClass}">
                            <span class="mr-1.5">${cuisineFlag}</span>${escapeHtml(cuisineTitle)}
                        </span>
                        <div class="flex items-center space-x-2 text-[11px] text-gray-500 font-semibold">
                            ${r.prep_time ? `<span class="bg-gray-100 px-2 py-0.5 rounded-md"><i class="fa-regular fa-clock mr-1 text-gray-400"></i>${escapeHtml(r.prep_time)}</span>` : ''}
                            ${r.difficulty ? `<span class="bg-gray-100 px-2 py-0.5 rounded-md"><i class="fa-solid fa-fire mr-1 text-amber-500"></i>${escapeHtml(r.difficulty)}</span>` : ''}
                        </div>
                    </div>
                    <h3 class="text-base sm:text-lg font-black text-gray-800 leading-snug">
                        ${escapeHtml(r.name)}
                    </h3>
                    ${r.description ? `<p class="text-xs text-gray-500 italic">${escapeHtml(r.description)}</p>` : ''}
                </div>

                <!-- Section 1: In-Fridge Ingredients -->
                <div>
                    <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        <i class="fa-solid fa-snowflake text-blue-500 mr-1"></i>วัตถุดิบในตู้เย็นที่นำมาใช้ (${usedItems.length} อย่าง)
                    </label>
                    <div class="flex flex-wrap gap-1.5">
                        ${usedItems.map(item => `
                            <span class="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <i class="fa-solid fa-check text-emerald-600 mr-1 text-[10px]"></i>
                                <span>${escapeHtml(item.name)}</span>
                                ${item.amount ? `<span class="ml-1 font-bold text-emerald-900">(${escapeHtml(item.amount)})</span>` : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>

                <!-- Section 2: Missing Ingredients (with exact quantities & copy button) -->
                <div>
                    ${missingItems.length > 0 ? `
                        <div class="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 space-y-2.5">
                            <div class="flex justify-between items-center">
                                <span class="text-xs font-bold text-amber-950 flex items-center">
                                    <i class="fa-solid fa-cart-shopping mr-1.5 text-amber-600"></i>ต้องซื้อเพิ่ม (${missingItems.length} อย่าง)
                                </span>
                                <button type="button" class="copy-shopping-btn px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold transition-colors flex items-center active:scale-95" data-recipe-idx="${idx}" title="คัดลอกรายการไปจดหรือส่งไลน์">
                                    <i class="fa-regular fa-copy mr-1 text-amber-600"></i>คัดลอกรายการ
                                </button>
                            </div>
                            <ul class="space-y-1.5 text-xs text-amber-950 pl-1">
                                ${missingItems.map(item => `
                                    <li class="flex items-start">
                                        <span class="text-amber-500 mr-2 font-bold">•</span>
                                        <div class="flex-1">
                                            <span class="font-bold text-amber-900">${escapeHtml(item.name)}</span>:
                                            <span class="font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded ml-1">${escapeHtml(item.amount || 'ตามชอบ')}</span>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : `
                        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 font-bold flex items-center">
                            <i class="fa-solid fa-circle-check text-emerald-600 mr-2 text-sm"></i>
                            <span>วัตถุดิบและเครื่องปรุงครบถ้วนในตู้เย็น! พร้อมเริ่มปรุงได้ทันที 🎉</span>
                        </div>
                    `}
                </div>

                <!-- Section 3: Cooking Instructions -->
                <div class="space-y-2 pt-1">
                    <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <i class="fa-solid fa-fire-burner text-orange-500 mr-1"></i>ขั้นตอนการทำ (${instructions.length} ขั้นตอน)
                    </label>
                    <div class="space-y-2 text-xs sm:text-sm text-gray-700 pl-0.5">
                        ${instructions.map((step, sIdx) => {
                            const cleanStep = step.replace(/^[0-9]+\.\s*/, '');
                            return `
                                <div class="flex items-start space-x-2.5">
                                    <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                                        ${sIdx + 1}
                                    </span>
                                    <p class="leading-relaxed flex-1">${escapeHtml(cleanStep)}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Section 4: Chef's Tip -->
                ${r.chef_tip ? `
                    <div class="bg-yellow-50/90 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-950 flex items-start space-x-2">
                        <i class="fa-solid fa-lightbulb text-yellow-500 mt-0.5 flex-shrink-0"></i>
                        <p class="leading-relaxed"><strong>เคล็ดลับจากเชฟ:</strong> ${escapeHtml(r.chef_tip)}</p>
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += `</div>`;
    aiChefContent.innerHTML = html;
}

// --- Copy to Clipboard Helper ---

function copyShoppingList(recipe) {
    if (!recipe || !recipe.missing_ingredients || recipe.missing_ingredients.length === 0) {
        showToast("เมนูนี้ไม่ต้องซื้อวัตถุดิบเพิ่มเลยครับ 🎉");
        return;
    }

    const itemsText = recipe.missing_ingredients.map(i => `• ${i.name} (${i.amount || 'ตามชอบ'})`).join('\n');
    const textToCopy = `🛒 รายการของที่ต้องซื้อสำหรับเมนู "${recipe.name}" (${recipe.cuisine || 'อาหาร'}):\n${itemsText}\n\n(บันทึกโดย TooYenKung AI Chef ✨)`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("คัดลอกรายการของที่ต้องซื้อแล้ว! 🛒");
        }).catch(() => {
            fallbackCopy(textToCopy);
        });
    } else {
        fallbackCopy(textToCopy);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
        document.execCommand('copy');
        showToast("คัดลอกรายการของที่ต้องซื้อแล้ว! 🛒");
    } catch (e) {
        showToast("ไม่สามารถคัดลอกได้");
    }
    document.body.removeChild(ta);
}

