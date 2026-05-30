# سیستم مدیریت فاکتورها (Invoice Management System)

## معرفی
برنامه وب دسکتاپ برای مدیریت فاکتورهای مشتریان با قابلیت‌های کامل CRUD، احراز هویت JWT، و پشتیبانی از تاریخ شمسی.

## ویژگی‌ها
- **احراز هویت**: کاربر ادمین با نام کاربری `1010` و رمز عبور `123456`
- **صفحه اصلی**: نمایش فاکتورهای ماه جاری شمسی با فیلتر ماه/سال
- **صفحه مشتری**: مشاهده تمام فاکتورهای یک مشتری با قابلیت جستجو
- **عملیات کامل CRUD**: افزودن، ویرایش، حذف فاکتورها در تمام صفحات
- **تغییر وضعیت**: وضعیت ارسال و تسویه با یک کلیک
- **تبدیل تاریخ**: نمایش تاریخ شمسی و ذخیره به صورت میلادی
- **اعلان‌ها**: پیام‌های toast برای بازخورد کاربر

## تکنولوژی‌ها

### بکاند
- Node.js + Express
- SQLite (با better-sqlite3)
- JWT برای احراز هویت
- bcryptjs برای رمزنگاری

### فرانت‌اند
- Vue 3 + Vite
- Pinia (مدیریت state)
- Vue Router
- TailwindCSS
- Axios
- persian-date (تبدیل تاریخ)

## نصب و راه‌اندازی

### پیش‌نیازها
- Node.js نسخه 20 یا بالاتر
- روی دستگاه جدید، `node_modules` را از دستگاه قبلی کپی نکن؛ باید وابستگی‌ها روی همان دستگاه نصب شوند تا ماژول‌های بومی مثل `better-sqlite3` برای همان نسخه Node ساخته شوند.

### نصب بکاند
```bash
cd backend
cp .env.example .env
# ویرایش .env و تنظیم JWT_SECRET
npm install
npm start
```

اگر بعد از انتقال پروژه با خطای `NODE_MODULE_VERSION` برای `better-sqlite3` روبه‌رو شدی، این‌ها را انجام بده:

```powershell
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm start
```

اگر نمی‌خواهی `package-lock.json` را حذف کنی، حداقل `node_modules` را پاک کن و دوباره `npm install` بزن.

### نصب فرانت‌اند
```bash
cd frontend
npm install
npm run dev
```

### اجرا
- بکاند: http://localhost:3000
- فرانت‌اند: http://localhost:5173

## دیتابیس و بک‌آپ

- دیتابیس برنامه به صورت محلی در SQLite ذخیره می‌شود و فایل اصلی آن در مسیر `backend/data/tracking.db` ساخته می‌شود.
- با هر بار اجرای بک‌اند، یک بک‌آپ جدید ساخته می‌شود و فایل‌ها در `backend/data/backups/` ذخیره می‌شوند.
- فقط 12 بک‌آپ آخر نگه داشته می‌شود تا فضای دیسک بی‌جهت پر نشود.
- بعد از ساخت بک‌آپ، تغییرات پوشه بک‌آپ به صورت خودکار commit و روی `origin` push می‌شود (اگر مخزن git و دسترسی احراز هویت وجود داشته باشد).
- اگر بخواهی فقط بک‌آپ محلی داشته باشی و push انجام نشود، در فایل `.env` مقدار `BACKUP_GIT_PUSH=false` را بگذار.
- برای بک‌آپ دستی:

```bash
cd backend
npm run backup
```

- برای بازیابی آخرین بک‌آپ یا یک فایل مشخص:

```bash
cd backend
npm run restore
# یا
npm run restore -- path\to\backup.db
```

- برای ثبت بک‌آپ هفتگی مستقل در Task Scheduler ویندوز (اختیاری):

```powershell
cd tracking-main\backend
npm run schedule-backup
```

- اگر بخواهی با یک کلیک ثبتش کنی، فایل [install-weekly-backup.bat](install-weekly-backup.bat) را اجرا کن؛ این فایل برای ثبت تسک، پنجره UAC ویندوز را باز می‌کند و باید تأییدش کنی.

- اگر بخواهی تسک را حذف کنی:

```powershell
powershell -ExecutionPolicy Bypass -File ..\scripts\remove-weekly-backup-task.ps1
```

- برای حذف یک‌کلیکی هم فایل [remove-weekly-backup.bat](remove-weekly-backup.bat) را اجرا کن؛ آن هم UAC را باز می‌کند.

- همچنین می‌توانی از `npm run unschedule-backup` داخل پوشه `backend` استفاده کنی.

## اجرای یک‌کلیکی

- فایل [run-app.bat](run-app.bat) را اجرا کنید تا بک‌اند و فرانت‌اند هم‌زمان بالا بیایند.
- اگر `node_modules` موجود نباشد، همان اجرا اول برای هر بخش `npm install` انجام می‌شود.
- برای بازیابی اطلاعات، قبل از restore بهتر است بک‌اند را متوقف کنید.

## ساختار پروژه
```
tracking/
├── frontend/          # Vue 3 application
│   ├── src/
│   │   ├── components/   # InvoiceTable, InvoiceForm, SearchBar, ...
│   │   ├── pages/        # Login, MainDashboard, CustomerDetail
│   │   ├── stores/       # Pinia stores
│   │   └── utils/        # api.js, dateConverter.js
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── controllers/  # Auth, Invoice, Customer
│   │   ├── middleware/   # JWT auth
│   │   ├── routes/       # API routes
│   │   └── db/           # SQLite setup
│   └── package.json
└── README.md
```

## API Endpoints
- `POST /api/auth/login` - ورود به سیستم
- `GET /api/invoices?year=&month=` - دریافت فاکتورها با فیلتر ماه
- `GET /api/invoices/customer/:id` - فاکتورهای یک مشتری
- `GET /api/invoices/search` - جستجوی فاکتورها
- `POST /api/invoices` - ایجاد فاکتور جدید
- `PUT /api/invoices/:id` - ویرایش فاکتور
- `DELETE /api/invoices/:id` - حذف فاکتور
- `PATCH /api/invoices/:id/status` - تغییر وضعیت
- `GET /api/customers` - دریافت همه مشتریان
- `POST /api/customers` - ایجاد مشتری
- `PUT /api/customers/:id` - ویرایش مشتری
- `DELETE /api/customers/:id` - حذف مشتری