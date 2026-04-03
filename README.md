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
- Node.js نسخه 18 یا بالاتر

### نصب بکاند
```bash
cd backend
cp .env.example .env
# ویرایش .env و تنظیم JWT_SECRET
npm install
npm start
```

### نصب فرانت‌اند
```bash
cd frontend
npm install
npm run dev
```

### اجرا
- بکاند: http://localhost:3000
- فرانت‌اند: http://localhost:5173

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