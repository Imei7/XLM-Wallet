# 🚀 XLM Auto Withdraw Bot

Sistem Telegram Bot production-grade untuk withdrawal otomatis Stellar Lumens (XLM) ke Binance dengan fitur multi-wallet, scheduling, dan keamanan enterprise.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Persyaratan](#-persyaratan)
- [Instalasi](#-instalasi)
- [Konfigurasi](#-konfigurasi)
- [Menjalankan Bot](#-menjalankan-bot)
- [Deploy ke Railway](#-deploy-ke-railway)
- [Panduan Penggunaan](#-panduan-penggunaan)
- [Fitur Admin](#-fitur-admin)
- [Keamanan](#-keamanan)
- [Troubleshooting](#-troubleshooting)
- [Kontribusi](#-kontribusi)

---

## ✨ Fitur Utama

### 👤 Fitur User

| Fitur | Deskripsi |
|-------|-----------|
| 💼 **Multi-Wallet** | Kelola banyak wallet Stellar dalam satu akun |
| 🔐 **Mnemonic Terenkripsi** | Penyimpanan aman dengan AES-256-GCM encryption |
| 📤 **Withdraw Instant** | Tarik XLM langsung ke Binance |
| ⏱ **Auto Schedule** | Atur withdrawal otomatis berkala |
| 📊 **Statistics** | Pantau penggunaan dan limit harian |

### 👑 Fitur Admin

| Fitur | Deskripsi |
|-------|-----------|
| 📊 **Dashboard** | Monitor statistik sistem real-time |
| 👥 **User Management** | Approve, block, atur limit user |
| 💼 **Wallet Control** | Lihat dan kelola wallet semua user |
| 💸 **Transaction Control** | Monitor dan retry transaksi gagal |
| 📢 **Broadcast** | Kirim pesan ke semua user |

### 🔒 Fitur Keamanan

- ✅ AES-256-GCM encryption untuk mnemonic
- ✅ Per-user key derivation dari MASTER_KEY
- ✅ Idempotent transactions (anti double-send)
- ✅ Rate limiting per user
- ✅ Daily withdrawal limits
- ✅ Secure memory wiping

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                      TELEGRAM BOT                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   User      │  │   Admin     │  │  Middleware │        │
│  │  Handlers   │  │  Handlers   │  │  (Auth/RL)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                     SERVICES LAYER                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  User   │ │ Wallet  │ │  Tx     │ │Schedule │          │
│  │ Service │ │ Service │ │ Service │ │ Service │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
└───────┼───────────┼───────────┼───────────┼────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Prisma    │  │   Redis     │  │  Stellar    │        │
│  │   (SQLite)  │  │  (BullMQ)   │  │   SDK       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘

Process Separation:
┌──────────────┐     ┌──────────────┐
│  Bot Process │     │Worker Process│
│  (Telegram)  │────▶│   (Queue)    │
│   Port 3000  │     │  Background  │
└──────────────┘     └──────────────┘
```

---

## 📦 Persyaratan

- **Node.js** >= 18.0.0
- **Bun** (recommended) atau npm/yarn
- **Redis** server (local atau cloud)
- **Telegram Bot Token** (dari @BotFather)

---

## 🔧 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd xlm-auto-withdraw
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Database

```bash
bun run db:generate
bun run db:push
```

### 4. Generate Master Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy hasilnya (64 karakter hex) sebagai `MASTER_KEY`.

### 5. Buat File .env

```bash
cp .env.example .env
```

Edit file `.env` dengan konfigurasi Anda:

```env
# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token

# Admin Telegram ID (angka)
ADMIN_ID=your_telegram_user_id

# Database (SQLite)
DATABASE_URL="file:./dev.db"

# Redis
REDIS_URL=redis://localhost:6379

# Security - 64 karakter hex (32 bytes)
MASTER_KEY=your_64_character_hex_key_here

# Scheduler
ENABLE_SCHEDULER=true

# Environment
NODE_ENV=development
```

---

## ⚙️ Konfigurasi

### Mendapatkan Telegram Bot Token

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi untuk membuat bot
4. Copy token yang diberikan

### Mendapatkan Telegram User ID

1. Buka Telegram, cari **@userinfobot**
2. Kirim `/start`
3. Copy ID yang ditampilkan

### Cara Mendapatkan Master Key

```bash
# Menggunakan Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output contoh:
# a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890
```

---

## 🚀 Menjalankan Bot

### Development Mode

```bash
# Terminal 1 - Jalankan Bot
bun run bot

# Terminal 2 - Jalankan Worker
bun run worker

# Terminal 3 - Jalankan Web (optional)
bun run dev
```

### Production Mode

```bash
# Bot Process
NODE_ENV=production bun run bot

# Worker Process
NODE_ENV=production bun run worker
```

---

## 🚂 Deploy ke Railway

### Langkah 1: Buat Project Railway

1. Login ke [Railway](https://railway.app)
2. Buat project baru
3. Tambahkan Redis service

### Langkah 2: Buat 2 Service

#### Service 1: Bot
```yaml
Name: xlm-bot
Start Command: bun run bot
Variables:
  - TELEGRAM_TOKEN
  - ADMIN_ID
  - DATABASE_URL
  - REDIS_URL (dari Redis service)
  - MASTER_KEY
  - ENABLE_SCHEDULER=false
```

#### Service 2: Worker
```yaml
Name: xlm-worker
Start Command: bun run worker
Variables:
  - TELEGRAM_TOKEN
  - ADMIN_ID
  - DATABASE_URL
  - REDIS_URL (dari Redis service)
  - MASTER_KEY
  - ENABLE_SCHEDULER=true
```

### Langkah 3: Setup Database

Untuk production, gunakan database yang persistent:

```env
# Option 1: Railway Volume
DATABASE_URL="file:/data/prod.db"

# Option 2: PostgreSQL (recommended untuk production)
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### Langkah 4: Deploy

```bash
railway login
railway init
railway up
```

---

## 📱 Panduan Penggunaan

### Menu Utama User

```
┌─────────────────────────────────────┐
│         🏠 Main Menu                │
├─────────────────────────────────────┤
│  💼 Wallet    │  📤 Withdraw        │
│  ⏱ Auto       │  ⚙️ Settings        │
│              👑 Admin Panel          │
└─────────────────────────────────────┘
```

### Alur Kerja Wallet

```
1. 💼 Wallet → ➕ Add Wallet
   ↓
2. Masukkan alamat Stellar (public key)
   ↓
3. Wallet tersimpan ✅

1. 💼 Wallet → 🔑 Import Mnemonic
   ↓
2. Masukkan 12/24 kata mnemonic
   ↓
3. Mnemonic terenkripsi ✅
```

### Alur Withdraw

```
1. 📤 Withdraw → 📤 New Withdraw
   ↓
2. Pilih wallet
   ↓
3. Masukkan jumlah XLM
   ↓
4. Konfirmasi → Transaksi masuk antrian
   ↓
5. Worker memproses → XLM terkirim ke Binance ✅
```

### Alur Auto Schedule

```
1. ⏱ Auto Schedule → ➕ New Schedule
   ↓
2. Pilih wallet
   ↓
3. Masukkan jumlah XLM
   ↓
4. Pilih interval (1/6/12/24 jam)
   ↓
5. Schedule aktif ✅
   ↓
6. Withdraw otomatis sesuai jadwal
```

---

## 👑 Fitur Admin

### Dashboard

```
📊 Dashboard
├── 👥 Users
│   ├── Total: X
│   ├── Active: X
│   ├── Pending: X
│   └── Blocked: X
├── 💸 Transactions
│   ├── Total: X
│   ├── Success: X
│   ├── Pending: X
│   └── Failed: X
└── ⏱ Schedules
    ├── Total: X
    └── Active: X
```

### User Management

```
👥 User Management
├── ⏳ Pending Users → Approve/Reject
├── ✅ Active Users → View/Block
├── 🚫 Blocked Users → Unblock
└── 🔍 Search User → By Telegram ID
```

### Broadcast System

```
📢 Broadcast
├── Target: All Users / Active Users / Custom
├── Message: [Tulis pesan]
├── Preview → Confirm
└── Sending batches...
    ├── Batch 1/10 ✅
    ├── Batch 2/10 ✅
    └── Report: 100 success, 2 failed
```

---

## 🔐 Keamanan

### Encryption Flow

```
User Mnemonic (plaintext)
        ↓
AES-256-GCM Encryption
        ↓
Per-User Key Derivation (PBKDF2)
        ↓
MASTER_KEY + userId → User Key
        ↓
Encrypted Data + IV + Auth Tag
        ↓
Stored in Database (encrypted)
```

### Best Practices

1. **Jangan share MASTER_KEY** - Simpan dengan aman
2. **Gunakan HTTPS** - Untuk semua koneksi
3. **Backup database** - Secara berkala
4. **Monitor logs** - Pantau aktivitas mencurigakan
5. **Update dependencies** - Secara rutin

### Security Features

| Feature | Implementasi |
|---------|-------------|
| Encryption | AES-256-GCM |
| Key Derivation | PBKDF2 (100,000 iterations) |
| Idempotency | SHA-256 hash untuk setiap transaksi |
| Rate Limiting | 10 requests/minute per user |
| Daily Limit | Configurable per user |
| Memory Safety | Secure wipe after use |

---

## ❓ Troubleshooting

### Bot tidak start

```bash
# Cek environment variables
cat .env

# Pastikan semua required variables ada:
# - TELEGRAM_TOKEN
# - ADMIN_ID
# - DATABASE_URL
# - REDIS_URL
# - MASTER_KEY (64 hex chars)
```

### Redis connection error

```bash
# Cek Redis berjalan
redis-cli ping
# Output: PONG

# Jika tidak, jalankan Redis
redis-server
```

### Database error

```bash
# Reset database
bun run db:reset

# Atau push ulang schema
bun run db:push
```

### Worker tidak memproses

```bash
# Cek ENABLE_SCHEDULER=true di .env
# Pastikan worker running di terminal terpisah
bun run worker
```

### Transaksi gagal

```
Kemungkinan penyebab:
1. Saldo XLM tidak cukup
2. Mnemonic tidak valid
3. Network Stellar sedang sibuk
4. Alamat tujuan salah

Solusi:
1. Cek saldo wallet
2. Verifikasi mnemonic
3. Retry transaksi dari Admin Panel
4. Cek alamat Binance deposit
```

---

## 📁 Struktur File

```
project/
├── src/
│   ├── bot.js                 # Entry point bot
│   ├── worker.js              # Entry point worker
│   ├── config/
│   │   └── index.js           # Konfigurasi
│   ├── db/
│   │   └── index.js           # Database layer
│   ├── queue/
│   │   └── index.js           # BullMQ queues
│   ├── security/
│   │   └── encryption.js      # AES-256-GCM
│   ├── services/
│   │   ├── user.js
│   │   ├── wallet.js
│   │   ├── transaction.js
│   │   ├── schedule.js
│   │   ├── broadcast.js
│   │   ├── stellar.js
│   │   └── scheduler.js
│   ├── bot/
│   │   ├── middleware/
│   │   │   └── index.js
│   │   └── handlers/
│   │       ├── keyboards.js
│   │       ├── user.js
│   │       └── admin.js
│   └── worker/
│       └── processors/
│           ├── withdraw.js
│           ├── schedule.js
│           └── broadcast.js
├── prisma/
│   └── schema.prisma          # Database schema
├── .env.example
├── package.json
└── README.md
```

---

## 🔧 Scripts

| Command | Deskripsi |
|---------|-----------|
| `bun run bot` | Jalankan Telegram bot |
| `bun run worker` | Jalankan queue worker |
| `bun run dev` | Jalankan Next.js dev server |
| `bun run db:push` | Push schema ke database |
| `bun run db:generate` | Generate Prisma client |
| `bun run lint` | Cek kode dengan ESLint |

---

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

---

## 📄 License

MIT License - lihat file [LICENSE](LICENSE) untuk detail.

---

## 📞 Support

Jika mengalami masalah:

1. Baca [Troubleshooting](#-troubleshooting)
2. Cek [Issues](../../issues) yang sudah ada
3. Buat issue baru dengan detail:
   - Deskripsi masalah
   - Langkah reproduksi
   - Log error
   - Environment (Node version, OS, dll)

---

## ⚠️ Disclaimer

**PENTING:** Software ini berhubungan dengan cryptocurrency. Gunakan dengan risiko sendiri.

- Selalu test di testnet terlebih dahulu
- Backup mnemonic dan private keys
- Jangan share MASTER_KEY dengan siapapun
- Verifikasi alamat tujuan sebelum mengirim

---

## 🙏 Credits

- [Grammy](https://grammy.dev/) - Telegram Bot Framework
- [Stellar SDK](https://stellar.org/developers) - Stellar Network
- [BullMQ](https://bullmq.io/) - Queue System
- [Prisma](https://prisma.io/) - Database ORM

---

<p align="center">
  Made with ❤️ for the Stellar Community
</p>
