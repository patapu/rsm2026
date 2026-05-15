# Code Review — UI & `lib/me.ts`

> สโคป: components ภายใต้ `app/`, `components/layout/`, `components/sections/`, `components/resume/`, `components/ui/`, `components/chat/ChatInterface.tsx` และ data layer ที่ `lib/me.ts`

---

## 1. `lib/me.ts` — Data + Schema layer

### สิ่งที่ทำได้ดี

- **Zod เป็น source of truth + infer TS types** — schema นิยามครั้งเดียว, type ตามมาเอง (`z.infer<typeof ...>`). ไม่มี drift ระหว่าง type กับ runtime validation
- **Parse ตอน module load** (`MeDataSchema.parse(rawMeData)` บรรทัดที่ 593) — fail fast ตั้งแต่ build / startup ถ้า data ผิด schema
- **แยก raw data → validated `ME` singleton** ชัดเจน, downstream ใช้ `ME` ที่ผ่าน validation แล้วเท่านั้น
- **`'present'`-friendly date strings** ทำให้ data ดูเป็นมนุษย์, ไม่ต้องใส่ end date จริงสำหรับงานปัจจุบัน

### ปัญหา / จุดควรแก้

#### 🔴 Sentinel string `"coming soon"` แทน optional
```ts
// schema
linkedin: z.string(),
website: z.string(),

// data
linkedin: "coming soon",
website: "coming soon",

// usage (Hero.tsx)
{contact.linkedin && contact.linkedin !== "coming soon" && (...)}
```
- คอนซูเมอร์ต้องรู้ magic string ทุกที่ที่ใช้ → leak abstraction
- **แก้:** เปลี่ยน schema เป็น `.url().optional()` แล้วใน data ใส่ `undefined` (หรือลบ field ออก) ส่วน UI เช็คแค่ truthy พอ

#### 🔴 ไม่ validate format ของ URL / email / phone / date
```ts
ContactSchema: email: z.string().min(1)  // ควรเป็น z.string().email()
phone: z.string().min(1)                  // ไม่มี pattern เลย
ExperienceSchema: startDate: z.string()   // ควร regex YYYY-MM หรือ literal "present"
```
- Zod เปิดประตูให้ใส่อะไรก็ได้ — schema ป้องกัน typo ระดับ "ลืม field" แต่ไม่ป้องกัน "ใส่ค่ามั่ว"
- **แก้:** `z.string().regex(/^\d{4}-\d{2}$|^present$/)` หรือใช้ `z.union([z.string().date(), z.literal('present')])`

#### 🟡 `getAvailableMessage()` non-deterministic
```ts
export function getAvailableMessage(): string {
  const now = new Date()  // ต่างกันระหว่าง server / client → hydration mismatch ได้
  ...
}
```
- ถ้าใช้ใน server component ที่ render ก่อนเที่ยงคืน แล้ว client hydrate หลังเที่ยงคืน → ข้อความเปลี่ยน
- **แก้:** รับ `now: Date` เป็น parameter (testable + deterministic) แล้ว default `= new Date()` ในที่เรียก (server-only หรือ client-only ชัดเจน)
- หรือใช้ `Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' })` แทน `THAI_MONTHS` array

#### 🟡 ไฟล์เดียว 600+ บรรทัด
- Schema, types, raw data, helper ปนกัน → diff git อ่านยาก, conflict ง่ายเวลาแก้ data
- **แก้:** แยกเป็น
  - `lib/me/schema.ts` — Zod + types
  - `lib/me/data.ts` — raw object
  - `lib/me/index.ts` — `ME` singleton + helpers

#### 🟡 `profile.profileImage` เป็น dead field
```ts
profileImage: "assets/profile"   // data
// Hero.tsx → <Avatar.Image src="/profile.png" ... />  ← hardcoded ละเลย ME
```
- ถ้าจะใช้ก็ใช้, ถ้าไม่ใช้ก็ลบทั้ง field และ schema entry

#### 🟢 Minor
- ใช้ `name` / `company` เป็น React key — เสี่ยงพังถ้ามีชื่อซ้ำในอนาคต ใส่ `id` ดีกว่า
- `roles[]` ไม่มี constraint ว่า date ของ role ต้องอยู่ใน range ของ experience parent → schema ไม่ help case นี้ ต้อง `.refine()` ถ้าซีเรียส

---

## 2. UI — Layout & Navigation

### โครงรวม

```
app/layout.tsx
└── <SidebarLayout>                   ← left sidebar (Chat / Resume / Contact)
    └── {children}
        ├── /         → ChatInterface
        ├── /resume   → resume sections + <RightSidebar> (on-this-page)
        └── /contact  → contact card
```

### ปัญหา / จุดควรแก้

#### 🔴 Component ซ้อนหน้าที่ + dead code
- `components/layout/Navbar.tsx` ใช้ HeroUI Navbar → **ไม่ถูก import ที่ไหนเลย** (เช็คแล้ว layout ใช้ `SidebarLayout`)
- `components/resume/ResumeSidebar.tsx` มีทั้ง NAV_ITEMS *และ* SECTIONS — duplicate กับ `SidebarLayout` + `RightSidebar`
- `RightSidebar.tsx` กับ `ResumeSidebar.tsx` มี IntersectionObserver block ที่เหมือนกันเป๊ะ
- **แก้:** ลบ `Navbar.tsx` กับ `ResumeSidebar.tsx` ทิ้ง (ถ้าไม่ใช้จริง), แตก `useActiveSection(ids)` hook ออกมาใช้ร่วมกันใน RightSidebar

#### 🔴 `PageTransition` exit animation ไม่ทำงาน
```tsx
<motion.div initial={...} animate={...} exit={...}>
```
- `exit` prop ของ framer-motion ต้องอยู่ใน `<AnimatePresence>` ถึงจะ fire — ปัจจุบัน `PageTransition` wrap แต่ละ page โดยไม่มี `AnimatePresence` ครอบที่ layout → exit transition dead code
- **แก้:** ย้าย `<PageTransition>` ออกจากแต่ละ page, ไปครอบ `{children}` ใน `app/layout.tsx` ภายใน `<AnimatePresence mode="wait">` พร้อมใส่ `key={pathname}` (ต้องเป็น client component)

#### 🟡 Pattern ของ section component ซ้ำกัน 6 ครั้ง
ทุก section (Hero, Summary, Skills, Experience, Projects, Education, Hobbies) เปิดด้วย:
```tsx
<motion.section id="..." initial={{opacity:0,y:20}} whileInView={...} viewport={...} transition={...}>
  <SectionCard>
    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8">...</h2>
```
- **แก้:** ทำ wrapper เดียว `<AnimatedSection id title>{children}</AnimatedSection>` ลดบรรทัด + ความเสี่ยง prop drift
- Bonus: `Separator` หลัง section ก็อยู่ใน wrapper เดียวกันได้ (Education ไม่มี Separator ปิด — inconsistent)

#### 🟡 `Hero.tsx` import ไม่ใช้
```tsx
import SectionCard from "@/components/ui/SectionCard";  // ← ไม่ได้ใช้ใน return
```
- มี `__tests__/no-dead-imports.test.ts` แล้ว — น่าจะจับได้, ลองรัน test ดู

#### 🟡 Hardcoded `/profile.png` แทนที่จะอ่านจาก `ME.profile.profileImage`
ดูหัวข้อ `me.ts` ด้านบน — ถ้า data ไม่ใช้ก็ลบ, ถ้าจะใช้ก็เชื่อม

#### 🟡 Experience sort ภายใน render
```tsx
const sorted = [...experience].sort((a, b) => b.startDate.localeCompare(a.startDate))
```
- เรียงทุก render — ใส่ `useMemo` หรือ sort ตอน build ใน `lib/me.ts` ทีเดียว

#### 🟢 SubCard inline style
```tsx
style={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)', borderWidth: '2.5px' }}
```
- ทำงานได้ปกติ แต่ขัดกับ Tailwind elsewhere — ขยับไป arbitrary value `bg-[color-mix(...)]` หรือ define utility ใน `globals.css` จะ consistent กว่า

---

## 3. UI — Chat Interface (`components/chat/ChatInterface.tsx`)

### สิ่งที่ทำได้ดี

- 401 retry pattern (refetch fingerprint → retry POST) handle edge case ของ cookie หมดอายุได้ดี
- `getErrorMessage(status)` แยก map status → user-facing text ออกมา testable
- `aria-live="polite"` ใน messages container, `data-testid` ครบ — A11y / test แม่น
- Session id ผ่าน `localStorage` → incognito มี history แยก (comment อธิบายไว้ชัดเจน — ตรงตาม spirit ของคู่มือ comments)

### ปัญหา / จุดควรแก้

#### 🟡 4 `useEffect` mount-only แยกกัน
```tsx
useEffect(() => { /* scroll */ }, [messages])
useEffect(() => { inputRef.current?.focus() }, [])
useEffect(() => { ensureFingerprint() }, [])
useEffect(() => { loadHistory() }, [])
```
- 3 ตัวล่างเป็น mount-only ที่ทำคนละเรื่อง — แยกแบบนี้ก็ OK แต่ถ้ารวมเป็น `bootstrap()` ตัวเดียว flow จะอ่านง่ายขึ้น
- ที่สำคัญกว่า: `ensureFingerprint()` ควร `await` ก่อน `loadHistory()` ไม่งั้น load ครั้งแรกอาจโดน 401 แล้วเงียบ ๆ ไป (ดู `loadHistory` catch แล้ว swallow)

#### 🟡 `sendMessage` มี code duplication ระหว่าง first try กับ retry
- block fetch 2 อันใช้ header/body เหมือนกันเป๊ะ — extract `postChat(body)` ออกมา 1 ฟังก์ชัน

#### 🟡 `setIsLoading(true)` ระวัง stale closure
```tsx
const sendMessage = useCallback(async (...) => {
  if (!messageText.trim() || isLoading) return  // ← isLoading จาก closure
  ...
}, [isLoading])
```
- ทำงานถูกเพราะ deps มี `isLoading` แต่หมายความว่า callback ถูกสร้างใหม่ทุกครั้งที่ `isLoading` เปลี่ยน → input ทุก keystroke ก็ไม่ได้ใช้ memo benefit
- **แก้:** ใช้ ref `isLoadingRef.current` หรือยอมรับว่าไม่ต้อง `useCallback` เลย (component นี้ไม่ pass `sendMessage` ลงลูกอยู่แล้ว)

#### 🟢 Empty state UX
```tsx
{messages.length === 0 && !isLoading && <empty state>}
```
- ตอน loadHistory ครั้งแรกถ้า user มี history → messages ว่างชั่วครู่ก่อน fetch resolve → flash empty state
- **แก้:** เพิ่ม `isHistoryLoaded` state แล้วโชว์ skeleton หรือซ่อน empty state จนกว่าจะ load เสร็จ

---

## 4. ภาพรวม / Recommendations เรียงตามความสำคัญ

| Priority | Item | Effort |
|---|---|---|
| 🔴 P0 | ลบ `Navbar.tsx` / `ResumeSidebar.tsx` ถ้าไม่ใช้ — ลด confusion | 5 นาที |
| 🔴 P0 | แก้ `"coming soon"` sentinel → `.optional()` ใน Zod | 15 นาที |
| 🔴 P0 | ใส่ `AnimatePresence` ที่ layout หรือลบ `exit` ออกจาก `PageTransition` | 15 นาที |
| 🟡 P1 | Validate format ของ email / phone / dates ใน Zod | 30 นาที |
| 🟡 P1 | แตก `lib/me.ts` เป็น schema/data/index | 30 นาที |
| 🟡 P1 | สกัด `<AnimatedSection>` wrapper + `useActiveSection` hook | 1 ชม. |
| 🟡 P1 | Refactor `getAvailableMessage` รับ `now` เป็น arg | 10 นาที |
| 🟢 P2 | Dedupe code ใน `ChatInterface.sendMessage` retry path | 20 นาที |
| 🟢 P2 | Empty state ของ chat รอ history load เสร็จก่อน | 20 นาที |

### Strengths to keep
- Zod-first data layer + module-load validation
- Consistent `motion.section` pattern (แค่ DRY ขึ้นได้)
- `data-testid` + `aria-*` ค่อนข้างทั่วถึง — รักษาไว้
- Type inference จาก Zod — อย่าใส่ duplicate `interface`/`type` ทับ
