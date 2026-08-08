# فیتا — ردیاب رژیم و سلامت

وب‌اپ فارسی و راست‌چین برای ثبت آگاهانهٔ وعده‌ها و پیگیری روند سلامت. پروژه با Next.js App Router، TypeScript و Tailwind CSS ساخته می‌شود و آمادهٔ اتصال به Supabase است.

## پیش‌نیازها

- Node.js `20.19+` (نسخهٔ فعلی Next.js و Supabase به نسخهٔ جدیدتر Node نیاز دارند)
- npm
- یک پروژهٔ Supabase
- برای مراحل بعد: Supabase CLI و PostgreSQL/Supabase connection string

## اجرای محلی

1. وابستگی‌ها را نصب کنید:

   ```bash
   npm install
   ```

2. فایل نمونهٔ متغیرها را کپی کنید و مقادیر پروژهٔ Supabase خود را وارد کنید:

   ```bash
   cp .env.example .env.local
   ```

3. در Supabase، مسیر `http://localhost:3000/auth/callback` را در **Authentication → URL Configuration → Redirect URLs** اضافه کنید.

4. پروژه را اجرا کنید:

   ```bash
   npm run dev
   ```

سپس `http://localhost:3000` را باز کنید. فرم‌های ورود و ثبت‌نام در مسیرهای `/login` و `/register` قرار دارند.

## متغیرهای محیطی

| متغیر | کاربرد |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | آدرس پروژهٔ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | کلید عمومی Supabase برای Auth در مرورگر |
| `SUPABASE_SERVICE_ROLE_KEY` | فقط برای Route Handlerهای امن سمت‌سرور؛ هرگز در کلاینت استفاده نشود |
| `DATABASE_URL` | اتصال مستقیم PostgreSQL برای Prisma (از فاز ۱) |
| `AI_PROVIDER` | یکی از `openai`، `anthropic` یا `gemini` |
| `AI_PROVIDER_API_KEY` | کلید ارائه‌دهندهٔ Vision AI؛ فقط در Route Handler استفاده می‌شود |
| `AI_MODEL` | اختیاری؛ نام مدل Vision انتخاب‌شده |

## وضعیت توسعه

### فاز ۰ (انجام‌شده)

- Next.js + TypeScript + Tailwind CSS
- توکن‌های طراحی برند، فونت محلی Vazirmatn، RTL و پایهٔ ریسپانسیو
- کامپوننت‌های پایهٔ Button، Card و Input با طراحی اختصاصی
- Supabase Auth با ثبت‌نام، ورود و callback تأیید ایمیل

### فاز ۱ (انجام‌شده)

- schema اصلی Prisma در `prisma/schema.prisma`
- migration قابل‌ردیابی Supabase در `supabase/migrations/0001_user_data.sql`
- RLS برای تمام جداول دادهٔ کاربر و trigger ساخت خودکار پروفایل
- مسیر `/meals` برای ثبت دستی چند آیتمی و مشاهدهٔ وعده‌های امروز

#### اعمال migration پایگاه‌داده

پس از نصب و ورود به Supabase CLI، migrationها را روی پروژهٔ متصل اجرا کنید:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx prisma generate
```

برای migrationهای جدیدی که با Prisma ایجاد می‌کنید، پس از تنظیم `DATABASE_URL` از این دستور استفاده کنید:

```bash
npx prisma migrate dev
```

### فاز ۲ (انجام‌شده)

- تحلیل عکس غذا با OpenAI، Claude یا Gemini از طریق متغیر `AI_PROVIDER`
- پاسخ JSON ساخت‌یافته، تطبیق با seed غذاهای ایرانی و قابلیت ویرایش کامل پیش از ثبت
- فشرده‌سازی عکس تا ۱۰۲۴px در مرورگر؛ عکس تحلیل‌شده تا تأیید نهایی کاربر ذخیره نمی‌شود
- bucket خصوصی `meal-photos` و سیاست‌های Storage در `supabase/migrations/0002_meal_photo_storage.sql`

بعد از دریافت تغییرات فاز ۲، دوباره `npx supabase db push` را اجرا کنید. در `.env.local` مقدار `AI_PROVIDER` را مطابق API key موجودتان انتخاب کنید؛ کلید AI هرگز به مرورگر ارسال نمی‌شود. برای Gemini، مقدار `AI_PROVIDER=gemini` و یک API key معتبر و خصوصی قرار دهید. کلیدی که در گفتگو یا commit نمایش داده شود باید فوراً rotate شود.

### فاز ۳ (انجام‌شده)

- داشبورد `/dashboard` با progress ring کالری، درشت‌مغذی‌ها و نمودارهای ۷ و ۳۰ روزه
- Day Horizon Bar با نشانگرهای وعده و موقعیت زمانی واقعی آن‌ها
- Route Handler `GET /api/trends` با خواندن تحت RLS و منطقهٔ زمانی تهران
- انیمیشن‌های هدفمند `motion/react` با رعایت `prefers-reduced-motion`

### فاز ۴ (انجام‌شده)

- فرم پروفایل `/profile` برای مشخصات پایه، وزن، فعالیت، هدف و شرایط پزشکی اختیاری
- محاسبهٔ سمت‌سرور BMR/TDEE با Mifflin–St Jeor و هدف کالری روزانه
- ثبت تاریخچهٔ وزن و نمایش تذکر ثابت برای شرایط پزشکی

هدف کالری یک برآورد عمومی است، نه نسخهٔ پزشکی. برای دیابت، بارداری، فشار خون یا هر وضعیت پزشکی، پیش از تغییر رژیم با پزشک یا متخصص تغذیه مشورت کنید.

### فاز ۵ (انجام‌شده)

- برنامهٔ نمونهٔ ایرانی در مسیر `/diet-plan` با بازهٔ کالری وعده‌ها و هدف درشت‌مغذی‌ها
- ایجاد نسخهٔ جایگزین و نگه‌داری تنها یک برنامهٔ فعال برای هر کاربر
- ذخیره در `diet_plans` تحت RLS و هشدار ثابت برای شرایط پزشکی

این برنامه نمونهٔ عمومی و منعطف است؛ اندازهٔ وعده‌ها و انتخاب غذا باید با شرایط و توصیهٔ متخصص سازگار شوند.

### فاز ۶ (انجام‌شده)

- تحلیل اختیاری عکس بدن در `/body-analysis` با رضایت آگاهانهٔ صریح و محدودیت کاربران بزرگسال
- خروجی کیفی و غیرپزشکی با متن ثابت «این یک برآورد تصویری است، نه اندازه‌گیری پزشکی دقیق.»
- Storage خصوصی جداگانه در migration `supabase/migrations/0003_body_photo_privacy.sql`
- signed URL پنج‌دقیقه‌ای، گالری پیشرفت شخصی و حذف کامل فایل و رکورد توسط کاربر

پس از دریافت این فاز، برای ساخت bucket و ستون رضایت اجرا کنید:

```bash
npx supabase db push
```

### فاز ۷ (انجام‌شده)

- پنل واقعی `/admin` با احراز هویت سروری، جدول نقش جدا و ماتریس دسترسی `super_admin` / `admin` / `support`
- مدیریت کاربران، تعلیق، حذف حساب و فایل‌های Storage، moderation وعده‌ها، CRUD غذاها و گزارش عدم تطبیق AI
- مشاهدهٔ عکس بدن فقط با درخواست صریح، signed URL دو دقیقه‌ای و ثبت اجباری در audit log append-only
- نمودار KPI و مصرف AI، اعلان‌های in-app، feature flag واقعی برای تحلیل بدن، سقف هشدار هزینه و مدیریت نقش ادمین‌ها

پس از اعمال `supabase/migrations/0004_admin_panel.sql` با دستور زیر، نخستین کاربر را ابتدا از مسیر ثبت‌نام عادی بسازید. سپس UUID او را از **Authentication → Users** بردارید و فقط در SQL Editor این دستور را اجرا کنید:

```bash
npx supabase db push
```

```sql
insert into public.admin_users (user_id, role)
values ('UUID_OF_EXISTING_AUTH_USER', 'super_admin');
```

هرگز نقش ادمین را از فرم ثبت‌نام عمومی نسازید. برای حساب‌های ادمین فعال‌سازی 2FA توصیه می‌شود.

### فاز ۸ (انجام‌شده) — بسته‌بندی موبایل

- Capacitor 7 و پروژه‌های بومی `android/` و `ios/` به پروژه افزوده شدند.
- افزونهٔ `@capacitor/camera` در فرم ثبت وعده فعال است؛ در اپ بومی دکمهٔ «با دوربین عکس بگیر» عکس را با ضلع حداکثر ۱۰۲۴ پیکسل می‌گیرد و همان جریان تأیید پیش از ثبت را حفظ می‌کند.
- مجوزهای دوربین/گالری برای Android و iOS با توضیح فارسی تنظیم شده‌اند.

این پروژه به Route Handlerهای Next.js و احراز هویت سمت‌سرور متکی است؛ بنابراین نباید به static export تبدیل شود. پوستهٔ موبایل نسخهٔ وبِ **HTTPS منتشرشده** را بارگذاری می‌کند و در نبود آن، صفحهٔ راهنمای محلی نشان می‌دهد.

1. ابتدا نسخهٔ وب را روی دامنهٔ HTTPS خود مستقر کن و آن دامنه را به Redirect URLs در Supabase اضافه کن.
2. در PowerShell آدرس را فقط برای فرایند همگام‌سازی تنظیم کن و سپس فایل‌های native را به‌روز کن:

   ```powershell
   $env:CAPACITOR_SERVER_URL = "https://app.example.com"
   npm run mobile:sync
   ```

   از URL دارای `http://` فقط برای توسعهٔ محلی استفاده کن؛ نسخهٔ انتشار باید HTTPS باشد.
3. برای Android، پروژه را با Android Studio باز کن و روی emulator یا دستگاه اجرا کن:

   ```bash
   npm run mobile:android
   ```

   در Android Studio یک emulator بساز، اپ را اجرا کن، به `/meals` برو و مجوز دوربین و جریان «با دوربین عکس بگیر» را تست کن.
4. برای iOS، روی macOS پس از نصب Xcode و CocoaPods این دستور را اجرا کن:

   ```bash
   npm run mobile:ios
   ```

   سپس target را در Xcode روی یک شبیه‌ساز یا دستگاه انتخاب و اجرا کن. قبل از build نخست، `npm run mobile:sync` را با `CAPACITOR_SERVER_URL` تنظیم‌شده اجرا کن.

> تخمین‌های غذایی هوش مصنوعی تقریبی‌اند و جایگزین توصیهٔ پزشکی یا تغذیه‌ای نیستند. عکس‌های بدن در فاز ۶ با جریان رضایت آگاهانه و Storage خصوصی جداگانه پیاده‌سازی می‌شوند.
#   f i t t a  
 