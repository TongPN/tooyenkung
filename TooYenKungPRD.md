# Product Requirement Document (PRD)

**Project Name:** TooYenKung (ตู้เย็นคุง) - Fridge Inventory Web App  
**Target Platform:** Mobile-First Web App & Progressive Web App (PWA - Add to Home Screen)  
**Database & Backend:** Firebase Cloud Firestore (Serverless NoSQL)  
**Hosting & Deployment:** GitHub Pages (Automated Git-based Deployment)  
**Current Version:** Production v2.6  
**Last Updated:** October 2026  

---

## 1. ภาพรวมและเป้าหมาย (Overview & Objectives)
**TooYenKung (ตู้เย็นคุง)** คือระบบจัดการของและวัตถุดิบในตู้เย็นสำหรับครอบครัวและผู้ใช้ส่วนบุคคล (< 10 คน) ออกแบบภายใต้แนวคิด **Zero-Friction Mobile Experience** ช่วยให้สมาชิกในครอบครัวตรวจสอบของในตู้เย็น ตัดสต็อกตามปริมาณที่ใช้จริง บันทึกประวัติการทำอาหาร และป้องกันของเน่าเสียหมดอายุได้อย่างสะดวก รวดเร็ว ทุกที่ทุกเวลา

### ปรัชญาการพัฒนาระบบ (Core Principles)
1. **Zero-Maintenance for User:** สถาปัตยกรรมทำงานแบบ Serverless 100% ผ่าน GitHub Pages และ Firebase Cloud Firestore ไม่ต้องมีการก็อปปี้สคริปต์หรือ Deploy ด้วยมือ อัปเดตผ่าน Git Push เพียงจุดเดียว
2. **100% Free Forever:** ออกแบบให้อยู่ในขอบเขตโควตาฟรี (Spark Plan ของ Firebase และ GitHub Pages) ไม่มีค่าใช้จ่ายแอบแฝง
3. **App-Like Feel on Mobile:** รองรับ PWA ติดตั้งบนหน้าจอโฮมของมือถือ มีไอคอนเฉพาะตัว สวยงาม และเปิดใช้งานแบบเต็มหน้าจอ (Standalone Fullscreen) ไร้แถบเบราว์เซอร์
4. **Intuitive Cooking UX:** การใช้งานหลักในชีวิตประจำวันคือ **"หยิบใช้"** และ **"ใช้หมดแล้ว"** ไม่ใช่การตั้งค่าหรือแก้ไขข้อมูล

---

## 2. สถาปัตยกรรมระบบและโครงสร้างเทคโนโลยี (System Architecture & Tech Stack)

```
[ Mobile Safari / Chrome (PWA) / Desktop Browser ]
                       │
             HTTPS (GitHub Pages)
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[ Frontend SPA ]             [ Firebase Cloud Firestore ]
- HTML5 / Vanilla JS         - Real-time NoSQL Database
- Tailwind CSS (CDN)         - Offline Persistence Enabled
- Font Awesome 6 Icons       - Collection: 'inventory'
- PWA (Manifest & Icons)     - Collection: 'settings'
```

* **Frontend:** Single-Page Web Application (Vanilla JavaScript, HTML5, Tailwind CSS, FontAwesome 6)
* **Hosting:** GitHub Pages (Serving from `main` branch: `https://TongPN.github.io/tooyenkung/`)
* **Backend & Database:** Google Firebase Cloud Firestore (Compat SDK v10.8.0)
  * Real-time Data Sync ผ่าน Firestore `onSnapshot` Listener
  * รองรับ Offline Persistence แคชข้อมูลในเครื่องขณะสัญญาณขาดหาย
* **Security & Authentication:** Family PIN Lock (จัดการรหัสผ่านบน Firebase Cloud ปลอดภัยจาก Public Code) พร้อม Local Storage Session
* **PWA & Mobile Engine:** Web App Manifest (`manifest.json`), Apple Touch Icons, Meta Viewport Lock

---

## 3. ความปลอดภัยและการเข้าถึง (Security & Authentication)

### 3.1 Family PIN Access Screen
* ระบบล็อกหน้าจอสำหรับคนในครอบครัว เพื่อความเป็นส่วนตัว (รองรับผู้ใช้ < 10 คน)
* **การเก็บรหัสผ่าน (Zero-Secret Architecture):**
  * ตัวรหัสผ่าน PIN จะถูกจัดเก็บไว้บน Firebase Cloud Firestore ใน Collection `settings/security` โดยตรง และไม่มีการใส่รหัสผ่านลับในโค้ดหรือ Git Repository ที่เป็น Public เด็ดขาด
* **พฤติกรรมการทำงาน:**
  * เมื่อเปิดใช้งานครั้งแรก ระบบจะแสดงหน้าจอใส่รหัสผ่าน 4 หลัก
  * ระบบจะตรวจสอบรหัสผ่านกับฐานข้อมูล Firestore แบบไดนามิก
  * หากกรอกถูกต้อง ระบบจะบันทึกสถานะผ่านสิทธิ์ลงใน `localStorage` (`tooyenkung_pin_auth = 'true'`) และเริ่มเชื่อมต่อฐานข้อมูล Real-time
  * หากรหัสผ่านผิด จะแสดงข้อความเตือนสีแดงและเคลียร์ช่องกรอก
  * เมื่อยืนยันสิทธิ์สำเร็จแล้ว การเปิดใช้งานครั้งต่อไปบนเครื่องเดิมจะไม่ต้องกรอกรหัสซ้ำ

---

## 4. โครงสร้างฐานข้อมูล (Database Schema: Cloud Firestore)

### 4.1 Collection: `inventory` (รายการวัตถุดิบในตู้เย็น)
เอกสารแต่ละชิ้น (Document) เก็บข้อมูลวัตถุดิบ 1 ชนิด:

| ฟิลด์ (Field) | ชนิดข้อมูล (Type) | ตัวอย่างข้อมูล | คำอธิบาย |
|---|---|---|---|
| `Item_Name` | String | `"หมูสันนอก"` | ชื่อวัตถุดิบ (Required) |
| `Category` | String | `"เนื้อสัตว์"` | หมวดหมู่: `เนื้อสัตว์`, `ผัก/ผลไม้`, `ไข่/นม`, `เครื่องปรุง`, `อาหารสำเร็จ`, `อื่นๆ` |
| `Remaining_Qty` | Number (Float) | `2` หรือ `250` | ปริมาณคงเหลือปัจจุบันในตู้เย็น |
| `Initial_Qty` | Number (Float) | `3` หรือ `500` | ปริมาณเริ่มต้นที่นำเข้าตู้เย็นครั้งแรก |
| `usedCount` | Number (Float) | `1` หรือ `250` | ปริมาณสะสมที่หยิบใช้ไปแล้ว |
| `Unit` | String | `"ชิ้น"`, `"กรัม"`, `"ขวด"` | หน่วยนับ (ดึงมาจากระบบจัดการหน่วย) |
| `Status` | String | `"Active"` / `"Depleted"` | สถานะ: `Active` (มีอยู่ในตู้), `Depleted` (ใช้หมดแล้ว) |
| `Purchase_Date` | String (YYYY-MM-DD) | `"2026-10-11"` | วันที่ซื้อหรือนำเข้าตู้เย็น (เลือกย้อนหลังได้) |
| `Expiry_Date` | String (YYYY-MM-DD) | `"2026-10-18"` | วันหมดอายุ |
| `history` | Array of Objects | `[...]` | บันทึกประวัติการใช้งานของวัตถุดิบชิ้นนี้ (ดูโครงสร้างย่อย) |
| `createdAt` | ServerTimestamp | *Timestamp* | วัน-เวลาที่สร้างข้อมูล |
| `updatedAt` | ServerTimestamp | *Timestamp* | วัน-เวลาที่อัปเดตข้อมูลล่าสุด |

#### โครงสร้างของอ็อบเจกต์ใน `history` Array:
```json
{
  "id": "h_1791703089814_ab12c",
  "date": "2026-10-11T07:15:23.123Z",
  "displayDate": "11 ต.ค. 16:15 น.",
  "action": "consume", // "create" | "consume" | "deplete"
  "amount": 1,
  "remaining": 2,
  "note": "หยิบใช้ 1 ชิ้น (คงเหลือ 2 ชิ้น)"
}
```

### 4.2 Collection: `settings` -> Document: `units` (การจัดการหน่วยนับ)
* **ฟิลด์ `list` (Array of Strings):** รายชื่อหน่วยนับทั้งหมดในระบบ
* **ค่าเริ่มต้น (Default Units):** `["ชิ้น", "กล่อง", "ขวด", "ถุง", "ฟอง", "แพ็ค", "กรัม", "กก.", "จาน", "ห่อ", "มล."]`
* รองรับการเพิ่ม แก้ไขชื่อ และลบหน่วยนับแบบ Real-time ข้ามทุกอุปกรณ์

---

## 5. รายละเอียดฟังก์ชันการทำงาน (Detailed Functional Specifications)

### 5.1 แถบส่วนหัวและการควบคุม (Header & System Controls)
* **โลโก้ TooYenKung:** แสดงชื่อแอปและไอคอนเกล็ดหิมะ
* **Live Sync Badge:** แสดงไฟกระพริบสีเขียวพร้อมคำว่า `Live` ยืนยันการเชื่อมต่อ Firestore Real-time
* **ปุ่ม Reload หน้าเว็บจริง (`refreshBtn`):**
  * ติดตั้งอยู่มุมขวาบน
  * ออกแบบมาแก้ปัญหาข้อจำกัดของ iOS Standalone PWA ที่ไม่มีแถบ URL และไม่มี Pull-to-refresh
  * เมื่อกด จะสั่งการ `window.location.reload()` โหลดหน้าเว็บใหม่ทั้งหมดเพื่อดึงโค้ดเวอร์ชันล่าสุดทันที
* **Tab Switcher (แถบสลับหน้า):**
  * ปุ่ม **"ของในตู้เย็น" (Inventory):** พร้อมตัวเลข Badge นับจำนวนของที่ยังเหลืออยู่ในตู้
  * ปุ่ม **"ประวัติการใช้" (Usage History):** พร้อมตัวเลข Badge นับจำนวนประวัติทั้งหมด

---

### 5.2 แท็บ 1: รายการของในตู้เย็น (Inventory Tab)

#### การจัดเรียงและเลย์เอาต์ (Responsive Grid Layout)
* **Mobile Screen (< 640px):** แสดงผล 1 คอลัมน์เต็มตา
* **Tablet / iPad (640px – 1024px):** แสดงผล 2 คอลัมน์
* **MacBook / Laptop / Desktop (>= 1024px):**
  * จำกัดความกว้างสูงสุดที่ `max-w-5xl mx-auto`
  * แสดงผลสูงสุด **3 คอลัมน์ (`lg:grid-cols-3`)** เพื่อให้การ์ดมีความกว้างพอเหมาะ (~340–380px) ข้อความไม่บีบแคบจนตกบรรทัด
* **การเรียงลำดับการ์ด:** เรียงตาม `Expiry_Date` จากน้อยไปมากเสมอ (ของใกล้หมดอายุขึ้นก่อน)

#### รายละเอียดบนการ์ดวัตถุดิบ (Item Card Anatomy)
1. **หัวการ์ด:**
   * ชื่อวัตถุดิบ (ตัวหนา เด่นชัด)
   * ปุ่มไอคอนดินสอ **"แก้ไข" (Edit Pencil):** ขนาดกะทัดรัด สำหรับเปิด Modal เพื่อแก้ไขชื่อ, หมวด, หรือวันหมดอายุ (แยกจากการใช้งานประจำวัน)
   * ป้ายหมวดหมู่วัตถุดิบ
   * **ป้ายสถานะวันหมดอายุ (Color-Coded Expiry Badge):**
     * 🟢 **สีเขียว:** เหลือมากกว่า 5 วัน
     * 🟠 **สีส้ม:** เหลือ 3–5 วัน
     * 🔴 **สีแดง:** เหลือ $\le 2$ วัน หรือหมดอายุแล้ว (`หมดอายุแล้ว X วันก่อน`)
2. **ข้อมูลการซื้อ:**
   * แสดงวันที่ซื้อจริง `🛒 ซื้อเมื่อ: YYYY-MM-DD`
3. **แถบแสดงจำนวนคงเหลือ (Stock Display Box):**
   * ฝั่งซ้าย: แสดง **"คงเหลือในตู้:"** พร้อมตัวเลขและหน่วยขนาดใหญ่
   * ฝั่งขวา: แสดง Badge **"ใช้ไปแล้ว: X [หน่วย]"** (สีส้ม) หากเคยมีการหยิบใช้ หรือแสดง Badge **"พร้อมใช้"** (สีเขียว) หากยังไม่เคยใช้
4. **ปุ่มการกระทำหลักด้านล่าง (Hero Action Buttons):**
   * 🟦 **ปุ่ม "ใช้" (Primary Action):** สีน้ำเงินเด่นชัด เมื่อกดจะเปิด Pop-up ระบุปริมาณที่ใช้จริง
   * ⬜ **ปุ่ม "ใช้หมดแล้ว" (Secondary Action):** สำหรับกดเคลียร์ของออกจากตู้ มีหน้าต่างยืนยันความปลอดภัย

---

### 5.3 หน้าต่างบันทึกการหยิบใช้ (Smart Consumption Modal - "ใช้")
เมื่อกดปุ่ม **"ใช้"** บนการ์ดใดๆ จะเปิด Pop-up ที่ออกแบบให้ใช้งานได้เร็วที่สุด:
* **ค่าเริ่มต้น (Default Value):** ตั้งค่าไว้ที่ **`1`** อัตโนมัติ (หรือเท่ากับสต็อกคงเหลือหากเหลือน้อยกว่า 1)
  * ผู้ใช้สามารถกด **"ยืนยันการใช้"** ได้ทันทีใน 1 วินาที โดยไม่ต้องพิมพ์ตัวเลขใหม่หากใช้ 1 หน่วย
* **ระบบคำนวณของคงเหลือล่วงหน้า (Live Preview):**
  * แสดงผลทันทีขณะพิมพ์ เช่น *"หลังใช้จะเหลือในตู้: 1 ชิ้น"*
  * หากกรอกเกินสต็อก จะขึ้นตัวอักษรสีแดงเตือน *"เกินสต็อกคงเหลือ! (ขาด X หน่วย)"*
* **ปุ่มลัดเลือกปริมาณ (Smart Presets):**
  * หน่วยกรัม/มล.: มีปุ่มลัด `50`, `100`, `200`, `ครึ่งหนึ่ง`, `ทั้งหมด`
  * หน่วยชิ้น/นับชิ้น: มีปุ่มลัด `1`, `2`, `3`, `ครึ่งหนึ่ง`, `ทั้งหมด`
* **ช่องโน้ตการทำอาหาร (Optional Note):** ใส่บันทึก เช่น *"ทำผัดกะเพรา"*, *"แกงจืด"*
* **ปุ่ม "ยืนยันการใช้":** บันทึกการตัดสต็อก อัปเดต Firestore และบันทึกประวัติทันที

---

### 5.4 หน้าต่างเพิ่ม / แก้ไขวัตถุดิบ (Add / Edit Item Modal)
* **ชื่อวัตถุดิบ:** กล่องกรอกข้อความพร้อม Auto-focus
* **หมวดหมู่วัตถุดิบ (Category Chips):** ปุ่มชิปแนวนอนแบบปัดได้ (`เนื้อสัตว์`, `ผัก/ผลไม้`, `ไข่/นม`, `เครื่องปรุง`, `อาหารสำเร็จ`, `อื่นๆ`)
* **จำนวน + หน่วยนับ:**
  * ช่องกรอกจำนวน (รองรับทศนิยม เช่น 0.5 หรือ 250)
  * Dropdown เลือกหน่วย พร้อมปุ่ม **"จัดการหน่วย"**
* **วันที่ซื้อ / นำเข้า (Purchase Date):**
  * ตั้งค่า Default เป็นวันที่ปัจจุบัน
  * ผู้ใช้สามารถเลือกย้อนหลังได้ตามจริงกรณีซื้อมาหลายวันแล้วเพิ่งบันทึก
* **วันหมดอายุ (Expiry Date):**
  * ปฏิทินเลือกวันหมดอายุ
  * ปุ่มลัดคำนวณวันหมดอายุอัตโนมัติ: `+3 วัน`, `+7 วัน`, `+14 วัน`, `+1 เดือน`
* **ปุ่ม Save to Fridge:** บันทึกข้อมูลขึ้นคลาวด์ พร้อมระบบหมุน Loading ปลอดภัย

---

### 5.5 ระบบจัดการหน่วยนับแบบไดนามิก (Units Management)
* เข้าถึงได้จาก Dropdown หน่วยนับในหน้าเพิ่มของ
* **เพิ่มหน่วยใหม่:** พิมพ์ชื่อหน่วยแล้วกดเพิ่ม ข้อมูลจะซิงก์ขึ้น Firestore ทันที
* **แก้ไขชื่อหน่วย:** เปลี่ยนชื่อหน่วยเดิม มีผลอัปเดตทันที
* **ลบหน่วย:** ลบหน่วยที่ไม่ต้องการออกจากระบบ

---

### 5.6 แท็บ 2: ประวัติการใช้งานแบบรวมศูนย์ (Usage History Feed)
* แสดง Timeline รายการเคลื่อนไหวทั้งหมดในตู้เย็น เรียงจากใหม่ไปเก่า:
  * 🔵 **นำเข้าตู้ (Create):** แสดงจำนวนที่นำเข้า วันที่ซื้อ และวันหมดอายุ
  * 🟠 **หยิบใช้ (Consume):** แสดงปริมาณที่ใช้ ปริมาณคงเหลือ และเมนูที่ทำ
  * ⚫ **ใช้หมดแล้ว (Deplete):** บันทึกการเคลียร์ของออกจากตู้
* **ปุ่มลบประวัติเฉพาะรายการ (Delete History Button):**
  * มีไอคอนถังขยะขนาดเล็กบนการ์ดประวัติทุกใบ
  * **ระบบคืนสต็อกอัตโนมัติ (Stock Rollback):** หากลบประวัติที่เป็นประเภท *"หยิบใช้"* ระบบจะคำนวณคืนค่าสต็อกที่เคยตัดไปกลับเข้าตู้เย็นให้อัตโนมัติ ป้องกันความผิดพลาดจากการกดผิด

---

## 6. ข้อกำหนดด้าน Mobile UX และ PWA (Mobile & PWA Engine)

### 6.1 Progressive Web App (PWA) Capabilities
* **ไฟล์ `manifest.json`:**
  * กำหนดชื่อแอป `TooYenKung - ตู้เย็นคุง`
  * โหมดการแสดงผล: `standalone`
  * ธีมสีระบบ: `#2563eb` (Royal Blue)
* **ชุดไอคอนแอป (Custom 3D App Icons):**
  * `apple-touch-icon.png` (180x180 px สำหรับ iOS Safari)
  * `icon-192.png` & `icon-512.png` (สำหรับ Android & PWA Splash Screen)
  * `favicon.png` (สำหรับเบราว์เซอร์ Desktop)
* **iOS Web App Capable Meta Tags:** ซ่อนแถบ URL และแถบสถานะเมื่อเปิดจากหน้าจอโฮม ให้ความรู้สึกเหมือน Native App 100%

### 6.2 Strict Mobile Viewport & Gesture Isolation
* **การล็อกหน้าจอแนวนอน:**
  * กำหนด `overflow-x: hidden !important; max-width: 100vw; overscroll-behavior-x: none;`
  * เพิ่ม `viewport-fit=cover` ให้พอดีกับขอบจอและรอยบากของ iPhone
* **การกักบริเวณ Gesture แถบหมวดหมู่ (`chips-scroll`):**
  * ใช้ `touch-action: pan-x; overscroll-behavior-x: contain;` ป้องกันอาการ Scroll Chaining ที่ทำให้ Pop-up หลุดลอยไปทางขวาเมื่อปัดสุดขอบ
* **การล็อกพื้นหลังขณะเปิด Pop-up (`modal-open`):**
  * เมื่อเปิด Modal ใดๆ จะสั่งล็อก `body` ไม่ให้เลื่อนหรือขยับเขยื้อน
  * การ์ด Modal กว้างเต็มหน้าจอพอดี (`w-full max-w-full modal-sheet`)
  * แตะพื้นหลังสีดำเพื่อปิด Modal ได้อย่างเป็นธรรมชาติ

---

## 7. ระบบ AI แนะนำเมนูอาหาร (AI Chef & Missing Ingredients Engine)

### 7.1 ภาพรวมฟีเจอร์ (v2.8)
* ฟีเจอร์ผู้ช่วยอัจฉริยะประจำบ้าน กดปุ่ม **"✨ AI แนะนำเมนู"** เพื่อให้ Gemini AI วิเคราะห์วัตถุดิบที่มีในตู้เย็น แล้วออกแบบเมนูที่ทำทานได้จริง
* **สองสไตล์อาหารหลัก (Thai & Japanese Focus):**
  * กำหนด Prompt ให้ AI แนะนำเฉพาะ **อาหารไทย** (🇹🇭) และ **อาหารญี่ปุ่น** (🇯🇵) เป็นหลัก
  * นำเสนอ 2 เมนูต่อการกดเรียก 1 ครั้ง พร้อมสรุปเวลาปรุง ระดับความยาก และคำอธิบายความอร่อย
* **กลยุทธ์ Zero Waste (ลดการทิ้งอาหาร):**
  * คัดกรองและส่งเฉพาะวัตถุดิบสถานะ `Active` ที่มีจำนวนคงเหลือมากกว่า 0
  * เรียงลำดับวัตถุดิบที่ **ใกล้หมดอายุ (Expiring Soon)** ส่งให้ AI หยิบมาเป็นวัตถุดิบหลักก่อนเสมอ

### 7.2 รายการของที่ต้องซื้อเพิ่มพร้อมปริมาณชัดเจน (Missing Ingredients List)
* หากเครื่องปรุงหรือวัตถุดิบในตู้ไม่ครบ AI จะแยกกล่องข้อความ **"🛒 ของที่ต้องซื้อเพิ่ม"** ไฮไลต์ชัดเจน
* **ระบุปริมาณและหน่วยนับที่แม่นยำ:** เช่น *โชยุ 2 ช้อนโต๊ะ, มิริน 1 ช้อนโต๊ะ, ไข่ไก่ 2 ฟอง, ต้นหอมญี่ปุ่น 1 ต้น* (ไม่ระบุเพียงชื่อวัตถุดิบลอยๆ)
* **ปุ่มคัดลอกรายการ (Copy Shopping List):** แตะปุ่มเดียวเพื่อ Copy รายการของที่ต้องซื้อทั้งหมดลงคลิปบอร์ด สะดวกสำหรับการส่งต่อใน LINE หรือเปิดดูตอนซื้อของที่ซูเปอร์มาร์เก็ต

### 7.3 สถาปัตยกรรมความปลอดภัยและการเชื่อมต่อ (Security & API Management)
* **Zero Secrets in Public Git:** ไม่มี API Key อยู่ในโค้ดหรือ Git Repository แม้แต่ตัวเดียว
* **Cloud-based Family Config:** ผู้ดูแลบ้านใส่ Gemini API Key ฟรีจาก [Google AI Studio](https://aistudio.google.com) เพียงครั้งเดียว ข้อมูลจะถูกจัดเก็บใน Firestore `settings/ai_config` ทำให้สมาชิกทุกคนในบ้านกดใช้งานได้ทันทีโดยไม่ต้องตั้งค่าเอง
* **Model Fallback Pipeline:** รองรับโมเดล Gemini Flash รุ่นล่าสุดแบบอัตโนมัติ (`gemini-2.5-flash` → `gemini-1.5-flash` → `gemini-2.0-flash`)

---

## 8. สรุปสถานะการทำงาน (Release Summary)

| ฟีเจอร์ / ความสามารถ | สถานะ | เวอร์ชัน | รายละเอียด |
|---|---|---|---|
| Firebase Firestore Database | ✅ สมบูรณ์ | v2.0 | แทนที่ Google Sheets ใช้งานได้แบบ Real-time |
| Dynamic Units Management | ✅ สมบูรณ์ | v2.1 | เพิ่ม/ลบ/แก้ไขหน่วยนับ Real-time |
| Responsive 3-Column Grid | ✅ สมบูรณ์ | v2.2 | จัดเลย์เอาต์การ์ดพอดีจอ ไม่บีบอักษร |
| Hero Action Buttons (ใช้ / ใช้หมดแล้ว) | ✅ สมบูรณ์ | v2.3 | ปรับปุ่มหลักให้ตรง UX การทำอาหาร |
| Usage History Feed & Rollback | ✅ สมบูรณ์ | v2.3 | แท็บประวัติแยก พร้อมปุ่มลบคืนสต็อก |
| Strict Horizontal Scroll Lock | ✅ สมบูรณ์ | v2.4 | ล็อกหน้าจอโมบายล์ ไม่เลื่อนซ้ายขวา |
| App Icon & PWA Engine | ✅ สมบูรณ์ | v2.4 | ติดตั้งบน Home Screen ได้ มีไอคอน 3D |
| Family PIN Security Decoupling | ✅ สมบูรณ์ | v2.5 / v2.7 | รหัสผ่าน Cloud-based ใน Firestore ไร้ Secret ใน Public Git |
| In-App True Reload Button | ✅ สมบูรณ์ | v2.6 | ปุ่ม Reload หน้าเว็บจริงสำหรับ iOS PWA |
| AI Chef (Thai & Japanese Recipes) | ✅ สมบูรณ์ | v2.8 | แนะนำเมนูไทย-ญี่ปุ่น คำนวณของที่ต้องซื้อเพิ่มพร้อมปริมาณชัดเจน |