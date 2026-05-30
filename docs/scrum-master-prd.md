# Product Requirements Document (PRD)

نسخه: 1.0
تاریخ: 2026-05-06
نویسنده: تیم توسعه / اسکرام‌مستر

## 1. خلاصه اجرایی
این سند نیازمندی‌های محصول برای اپلیکیشن مدیریت فاکتورها (Tracking) را تعریف می‌کند. هدف ارائه یک مرجع روشن برای تیم توسعه و ذی‌نفعان جهت برنامه‌ریزی اسپرینت، مدیریت بک‌لاگ، تعریف معیارهای آنالیتیکس و استخراج داده‌ها است.

## 2. اهداف محصول
- ارائه امکان ثبت، ویرایش، مشاهده و جستجوی فاکتورها
- مدیریت مشتریان و پیگیری وضعیت پرداخت
- فراهم کردن گزارش‌های مروری و استخراج CSV برای تحلیل
- اندازه‌گیری رفتار کاربران و تبدیل‌ها با Google Analytics

## 3. دامنه (Scope)
- شامل: صفحات ورود، داشبورد، فرم فاکتور، لیست و جستجوی فاکتورها، APIهای مربوطه و اسکریپت‌های استخراج داده
- خارج از دامنه اولیه: پرداخت آنلاین، صورتحساب چندارزی، اتوماسیون مالی پیچیده

## 4. بازیگران و ذی‌نفعان
- کاربر عادی (ثبت/مشاهده فاکتورها)
- مدیر (دسترسی به گزارش‌ها و KPI)
- تیم پشتیبانی/مالی
- Product Owner

## 5. نیازمندی‌های کارکردی (Functional)
1. احراز هویت
   - کاربران باید وارد سیستم شوند و توکن دریافت کنند.
   - مرجع: پیاده‌سازی فعلی در `backend/server.js` و صفحه `frontend/src/pages/Login.vue`.

2. مدیریت مشتری
   - ایجاد/ویرایش/حذف مشتری.
   - Component مرتبط: `frontend/src/components/*` (customer-related).

3. فاکتورها
   - ایجاد فاکتور از فرم: فیلدها شامل مشتری، تاریخ، آیتم‌ها، مبلغ و وضعیت پرداخت.
   - لیست و صفحه جزئیات فاکتور با امکان جستجو توسط مشتری و تاریخ.
   - Endpoints: بررسی `frontend/src/utils/api.js` برای مسیرها.

4. گزارش و استخراج داده
   - اسکریپت استخراج فاکتورها به CSV: `backend/scripts/queryInvoices.js` باید پارامتری شود تا بازه زمانی قابل انتخاب باشد.

5. آنالیتیکس
   - ارسال رویدادهای کلیدی به Google Analytics 4 (GA4).

## 6. نیازمندی‌های غیرکارکردی (Non-functional)
- امنیت: توکن JWT برای احراز هویت و محدودسازی دسترسی
- مقیاس‌پذیری: queryهای گزارش باید صفحه‌بندی شوند
- قابلیت تست: هر استوری باید همراه با تست‌های واحد یا e2e باشد

## 7. معیارهای موفقیت (KPIs)
- تعداد فاکتورهای ثبت‌شده در هفته
- میانگین زمان ثبت یک فاکتور (form completion time)
- نرخ خطا در ثبت فاکتور (failed submissions)
- کاربران فعال ماهانه (MAU)

## 8. User Stories نمونه
- قالب: «به عنوان [نقش]، می‌خواهم [عمل] تا [ارزش]» + معیار پذیرش

1) ورود کاربر
   - پذیرش: endpoint ورود موجود و `Login.vue` رفتار صحیح داشته باشد.

2) ثبت فاکتور
   - پذیرش: فرم اطلاعات را ارسال می‌کند، رکورد در DB درج می‌شود و کاربر پیام موفقیت می‌بیند.

3) جستجوی فاکتور
   - پذیرش: فیلترها (مشتری/تاریخ) نتیجه صحیح برمی‌گردانند و در `InvoiceTable.vue` نمایش داده می‌شود.

## 9. Acceptance Criteria (قالب تیک‌لیست)
- کد پوشه تست مربوطه را دارد
- بررسی کد انجام شده و PR پذیرفته شده
- تست e2e سناریوی اصلی پاس می‌شود
- مستندات کوتاه در بخش Description استوری نوشته شده

## 10. نقشه پیاده‌سازی به فایل‌های موجود
- Backend server: `backend/server.js`
- DB access: `backend/db/database.js`
- Query/export: `backend/scripts/queryInvoices.js`
- Frontend API helper: `frontend/src/utils/api.js`
- فرم فاکتور: `frontend/src/components/InvoiceForm.vue`
- جدول فاکتور و جستجو: `frontend/src/components/InvoiceTable.vue`, `frontend/src/components/SearchBar.vue`

## 11. آنالیتیکس — رویدادهای پیشنهادی (GA4)
- `login_success` / `login_failure` — پارامتر: method
- `invoice_created` — پارامترها: invoice_id, customer_id, amount, payment_status
- `invoice_searched` — پارامترها: query, result_count
- `invoice_view` — پارامتر: invoice_id

نقاط ثبت: در متدهای submit هر کامپوننت مرتبط (مثلاً `InvoiceForm.vue`, `SearchBar.vue`, `Login.vue`).

## 12. استخراج داده (Data Extraction)
- استفاده از `backend/scripts/queryInvoices.js` برای تولید CSV.
- پیشنهاد پارامترها: start_date, end_date, status, customer_id
- خروجی پیشنهادی: invoice_id, created_at, customer_id, items_count, amount, status

## 13. پیشنهاد کانفیگ Jira و Workflows
- Project key: TRK
- Issue types: Epic, Story, Task, Bug, Spike
- Board columns: Backlog → Selected for Sprint → To Do → In Progress → In Review → QA → Done
- فیلدهای پیشنهادی: Story Points, Component (backend/frontend), Release

## 14. Sprint cadence و مراسم‌ها (پیشنهاد)
- طول اسپرینت: 2 هفته
- جلسات: Planning, Daily Standup (15m), Review, Retrospective
- Definition of Done: unit tests, PR approved, deployed to staging

## 15. Tasks پیشنهادی فوری (برای اسپرینت اول)
1. پارامتری کردن `backend/scripts/queryInvoices.js` برای استخراج بازه‌ها
2. ثبت رویداد `invoice_created` در `InvoiceForm.vue`
3. ایجاد Story و Tasks مرتبط در Jira با шабلونی که در بخش 13 آمده

## 16. ریسک‌ها و وابستگی‌ها
- نبود تست e2e برای مسیرهای کریتیکال
- وابستگی به ساختار DB برای استخراج داده

## 17. پیوست‌ها و منابع
- مسیر فایل‌ها (بخش 10)
- اسکریپت نمونه استخراج: `backend/scripts/queryInvoices.js`

---
اگر می‌خواهید، من این فایل را به PDF تبدیل و در `docs/scrum-master-prd.pdf` ذخیره کنم — آیا مایلید طبق یکی از روش‌های زیر انجام دهم یا خودتان تبدیل کنید؟

روش‌های تبدیل پیشنهادی:
- با `pandoc`:
  - `pandoc docs/scrum-master-prd.md -o docs/scrum-master-prd.pdf`
- با `npx markdown-pdf`:
  - `npx markdown-pdf docs/scrum-master-prd.md -o docs/scrum-master-prd.pdf`

لطفا بگویید که می‌خواهید من اکنون تبدیل را اجرا کنم یا خودتان انجام دهید.
