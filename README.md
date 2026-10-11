# 🧊 TooYenKung (ตู้เย็นคุง)

> **Smart Fridge Inventory & AI Chef Web App for Families**  
> เว็บแอปพลิเคชันจัดการสต็อกตู้เย็นอัจฉริยะประจำบ้าน พร้อมระบบ AI Chef แนะนำเมนูอาหารไทยและญี่ปุ่น

🌐 **Live Web App:** [https://TongPN.github.io/tooyenkung/](https://TongPN.github.io/tooyenkung/)  
📱 **PWA Ready:** รองรับ "Add to Home Screen" ใช้งานแบบ Standalone App บน iOS และ Android เต็มหน้าจอ

---

## ✨ ไฮไลต์ฟีเจอร์เด่น (Key Features)

### 1. 🍳 AI Chef แนะนำเมนูอาหาร (v2.8)
* **เน้นอาหารไทย (🇹🇭) และอาหารญี่ปุ่น (🇯🇵):** ขับเคลื่อนด้วย Google Gemini AI ออกแบบเมนูที่ทำทานในครอบครัวได้จริง 2 เมนูต่อครั้ง
* **ลดการทิ้งอาหาร (Zero Food Waste):** ดึงวัตถุดิบที่ **"ใกล้หมดอายุ"** ในตู้เย็นมาเป็นเมนูหลักก่อนเสมอ
* **🛒 รายการของที่ต้องซื้อเพิ่มพร้อมปริมาณชัดเจน:** 
  * คำนวณวัตถุดิบและเครื่องปรุงที่ขาด พร้อมระบุสัดส่วนเป๊ะๆ เช่น *โชยุ 2 ช้อนโต๊ะ, ไข่ไก่ 2 ฟอง, ต้นหอม 1 ต้น*
  * **ปุ่มคัดลอก (Copy Shopping List):** แตะปุ่มเดียวเพื่อ Copy รายการของที่ต้องซื้อลงคลิปบอร์ด ส่งต่อเข้า LINE หรือเปิดดูตอนเดินซูเปอร์มาร์เก็ต
* **วิธีทำกระชับ 3–4 สเต็ป:** อ่านเข้าใจง่าย ทำตามได้ทันที พร้อมเคล็ดลับเด็ดจากเชฟ

### 2. ⚡ Real-Time Cloud Sync (Firebase Cloud Firestore)
* ข้อมูลในตู้เย็นอัปเดตแบบ Real-time ทันทีที่สมาชิกในบ้านคนใดคนหนึ่งเพิ่มหรือหยิบใช้ของ
* รองรับ Offline Persistence ใช้งานได้อย่างต่อเนื่องแม้ในจุดอับสัญญาณ

### 3. 📱 Mobile-First & PWA Experience
* ออกแบบหน้าจอแบบ Mobile-First พร้อมระบบล็อกหน้าจอแนวนอน (`overflow-x: hidden`, `overscroll-behavior-x: none`)
* ไอคอนแอป 3D สวยงาม รองรับการติดตั้งลงหน้าจอโฮม (iOS Safari & Android Chrome)
* มีปุ่ม **Reload หน้าเว็บจริง** ภายในแอป เพื่อให้ iOS Standalone PWA ดึงโค้ดเวอร์ชันล่าสุดได้เสมอ

### 4. 📊 จัดการสต็อกและประวัติการใช้ (Cooking UX)
* **การ์ดวัตถุดิบสีสันชัดเจน:** ป้ายสถานะวันหมดอายุ (เขียว / ส้ม / แดง)
* **ปุ่มด่วน "ใช้" และ "ใช้หมดแล้ว":** ตัดสต็อกได้รวดเร็วภายใน 1 วินาที มีปุ่มลัดเลือกปริมาณ (Presets) และช่องใส่โน้ตการทำอาหาร
* **ระบบจัดการหน่วยนับแบบไดนามิก (Dynamic Units):** เพิ่ม/ลบ/แก้ไขหน่วยนับ (ชิ้น, กรัม, ฟอง, ขวด, ฯลฯ) ได้ตามใจชอบ
* **Timeline ประวัติการใช้งาน (History Feed):** แสดงบันทึกการนำเข้าและหยิบใช้ทั้งหมด พร้อมปุ่มลบคืนสต็อกอัตโนมัติ (Stock Rollback)

### 5. 🔒 ปลอดภัยสูงสุดสำหรับครอบครัว (Zero-Secret Architecture)
* รหัสผ่านครอบครัว (Family PIN) และ Gemini API Key ถูกจัดเก็บไว้บน **Firebase Cloud Firestore** ปลอดภัย 100% ไร้ข้อมูลลับใน Public Git
* ตั้งค่า API Key เพียงคนเดียว สมาชิกทุกคนในบ้านกดใช้งาน AI ได้ทันที

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend:** Vanilla JavaScript (ES6+), HTML5, Tailwind CSS (CDN), Font Awesome 6
* **Database & Cloud:** Google Firebase Cloud Firestore (NoSQL Real-time)
* **AI Engine:** Google Gemini Flash API (`generativelanguage.googleapis.com`)
* **PWA Engine:** Web App Manifest (`manifest.json`), Apple Touch Icons, Meta Viewport Lock
* **Hosting:** GitHub Pages (Automated Deployment via `main` branch)

---

## 🚀 วิธีเริ่มใช้งาน (Getting Started)

1. เปิดเบราว์เซอร์ไปที่ [https://TongPN.github.io/tooyenkung/](https://TongPN.github.io/tooyenkung/)
2. กรอกรหัสผ่านครอบครัว (Family PIN) เพื่อเข้าสู่ระบบ (จำสิทธิ์อัตโนมัติ)
3. **ติดตั้งลงหน้าจอโฮม (แนะนำสำหรับมือถือ):**
   * **iOS Safari:** กดปุ่ม Share (แชร์) ➔ เลือก **"Add to Home Screen" (เพิ่มไปยังหน้าจอโฮม)**
   * **Android Chrome:** กดเมนู ➔ เลือก **"Install app" (ติดตั้งแอป)**
4. เริ่มบันทึกของเข้าตู้เย็น และกด **"✨ AI แนะนำเมนู"** เพื่อเริ่มทำอาหารได้เลย!

---

## 📄 Documentation

* รายละเอียดสเปกระบบฉบับสมบูรณ์: ดูได้ที่ [TooYenKungPRD.md](TooYenKungPRD.md)
