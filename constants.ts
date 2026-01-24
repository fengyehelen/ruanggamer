
import { Language, Platform, Activity } from './types';

// Default Fallback
export const TELEGRAM_LINK = "https://t.me/RuangGamer_id";

export const LANGUAGES: Record<Language, { label: string; flag: string; currency: string; rate: number }> = {
  id: { label: 'Indonesia', flag: '🇮🇩', currency: 'Rp', rate: 1 },
};

export const BANK_OPTIONS: Record<string, { name: string; type: 'bank' | 'ewallet' }[]> = {
  id: [
    { name: 'DANA', type: 'ewallet' },
    { name: 'OVO', type: 'ewallet' },
    { name: 'GoPay', type: 'ewallet' },
    { name: 'ShopeePay', type: 'ewallet' },
    { name: 'BCA', type: 'bank' },
    { name: 'Mandiri', type: 'bank' },
    { name: 'BRI', type: 'bank' },
    { name: 'BNI', type: 'bank' }
  ]
};

export const TRANSLATIONS = {
  id: {
    home: 'Beranda', earn: 'Cuan', tasks: 'Misi', profile: 'Profil', referral: 'Undang', login: 'Masuk', register: 'Daftar', merchantLogin: 'Login Mitra',
    phone: 'Nomor WhatsApp', email: 'Alamat Email', bindPhone: 'Ikat No. HP', enterPhone: 'Masukkan No HP', enterEmail: 'Masukkan Email',
    password: 'Kata Sandi', username: 'Username', verifyCode: 'Kode OTP', getCode: 'Minta Kode', appName: 'RuangGamer',
    balance: 'Saldo', withdraw: 'Tarik Dana', bindCard: 'Akun Bank', totalEarnings: 'Total Cuan', submitProof: 'Kirim Bukti',
    uploadScreenshot: 'Upload SS', audit: 'Cek', approve: 'Setuju', reject: 'Tolak',
    status: { ongoing: 'Proses', reviewing: 'Dicek', completed: 'Sukses', rejected: 'Gagal' },
    adminTabs: { users: 'Player', tasks: 'Misi', activities: 'Promo', audit: 'Audit Misi', admins: 'Admin', config: 'Sistem', messages: 'Pesan' },
    sort: 'Urutkan', sortLikes: 'Populer', sortReward: 'Termahal', sortCompleted: 'Terlaris',
    startTask: 'Ambil Misi', steps: 'Cara Main', rules: 'Syarat',
    uploadPlatform: 'Posting', hot: 'VIRAL', reward: 'Hadiah', remaining: 'Sisa Kuota', activityTitle: 'Event Spesial', play: 'Main',
    wait: 'Tunggu', sent: 'Terkirim', submit: 'Kirim', myTasksTitle: 'Misi Saya', noTasks: 'Belum ada misi diambil', scanQr: 'Scan QR',
    shareCode: 'Kode Reff', shareLink: 'Link Reff', copy: 'Salin', copied: 'Disalin!', messages: 'Kotak Masuk', notifications: 'Notifikasi',
    telegram: 'Grup Mabar', referralRules: 'Komisi 3 Tingkat', referralDesc: 'Ajak teman mabar dan dapatkan komisi seumur hidup dari deposit mereka.',
    level1: 'Level 1 (20%)', level2: 'Level 2 (10%)', level3: 'Level 3 (5%)',
    bankName: 'Bank / E-Wallet', accHolder: 'Nama Pemilik', accNumber: 'Nomor Rekening / HP',
    save: 'Simpan', cancel: 'Batal', activityName: 'Judul Event', targetCountry: 'Negara', uploadImage: 'Upload Gambar',
    addActivity: 'Tambah Event', activityContent: 'Konten Event', createTask: 'Buat Misi', taskName: 'Nama Game',
    taskDesc: 'Deskripsi', taskRules: 'Aturan', taskReward: 'Hadiah', taskLink: 'Link Download', example: 'Contoh',
    inviteCode: 'Kode Undangan', backToApp: 'Kembali', createAdmin: 'Buat Admin', adminRole: 'Peran',
    transactions: 'Riwayat Transaksi', amount: 'Jumlah', type: 'Tipe', date: 'Tanggal', sysConfig: 'Pengaturan Sistem',
    initBalance: 'Bonus Daftar', minWithdraw: 'Min Penarikan', sendMsg: 'Kirim Pesan', title: 'Judul', content: 'Isi',
    send: 'Kirim', todayStats: 'Cuan Hari Ini', totalInvited: 'Total Tim', comms: 'Komisi',
    walletType: 'Tipe Akun', confirmWithdraw: 'Konfirmasi Penarikan', insufficient: 'Saldo kurang', minWithdrawErr: 'Min penarikan adalah',
    selectAccount: 'Pilih Akun Cair', addAccount: 'Tambah Akun', shareVia: 'Bagikan ke',
    howItWorks: 'Cara Dapat Cuan',
    refStoryA: 'Kamu ajak A', refStoryB: 'A ajak B', refStoryC: 'B ajak C',
    refStoryEarn: 'Kamu dapat', refExample: 'Contoh: Jika bawahan deposit 100rb',
    statsPayout: 'Total Hadiah Dibayar', statsCompleted: 'Misi Selesai Hari Ini'
  }
};

export const MOCK_PLATFORMS: Platform[] = [
  {
    id: '1',
    name: 'Domino RP - Gacor',
    logoUrl: 'https://picsum.photos/100/100?random=1',
    description: 'Chip ungu termurah, pasti JP kakek zeus.',
    downloadLink: 'https://google.com',
    firstDepositAmount: 50000,
    rewardAmount: 15000,
    launchDate: '2023-10-01',
    isHot: true,
    isPinned: true,
    remainingQty: 45,
    totalQty: 100,
    steps: [
      { text: 'Klik "Ambil Misi" & Download APK' },
      { text: 'Daftar pakai No HP' },
      { text: 'Deposit Min 50rb' },
      { text: 'Upload SS Bukti Transfer' }
    ],
    rules: 'Khusus pengguna baru. Dilarang pakai VPN.',
    status: 'online',
    type: 'deposit',
    targetCountries: ['id']
  },
  {
    id: '2',
    name: 'Slot88 Maxwin',
    logoUrl: 'https://picsum.photos/100/100?random=2',
    description: 'Depo 20rb bonus 20rb. Gasken!',
    downloadLink: 'https://google.com',
    firstDepositAmount: 20000,
    rewardAmount: 25000,
    launchDate: '2023-11-15',
    remainingQty: 12,
    totalQty: 50,
    steps: [
      { text: 'Daftar Akun' },
      { text: 'Depo 20rb' },
      { text: 'Mainkan 5x spin' }
    ],
    rules: 'SS saldo akhir setelah main.',
    status: 'online',
    type: 'deposit',
    targetCountries: ['id']
  },
  {
    id: '3',
    name: 'Poker Garuda',
    logoUrl: 'https://picsum.photos/100/100?random=3',
    description: 'Turnamen Poker Gratis Hadiah 1 Juta',
    downloadLink: 'https://google.com',
    firstDepositAmount: 0,
    rewardAmount: 5000,
    launchDate: '2023-12-01',
    remainingQty: 88,
    totalQty: 200,
    steps: [
      { text: 'Download & Install' },
      { text: 'Login Tamu' },
      { text: 'SS Lobby' }
    ],
    rules: 'Cukup login saja.',
    status: 'online',
    type: 'register',
    targetCountries: ['id']
  },
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    title: 'Bonus Kemerdekaan',
    imageUrl: 'https://picsum.photos/800/400?random=10',
    content: 'Deposit 100rb dapat cashback 50rb khusus hari ini! Syarat: WD minimal turnover x1.',
    link: '/task/1',
    active: true,
    targetCountries: ['id']
  },
  {
    id: 'a2',
    title: 'Giveaway DANA Kaget',
    imageUrl: 'https://picsum.photos/800/400?random=11',
    content: 'Join grup telegram RuangGamer dan nantikan DANA kaget setiap jam 8 malam WIB.',
    link: '#',
    active: true,
    targetCountries: ['id']
  }
];
