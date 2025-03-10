const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Koneksi ke MongoDB
// **PERINGATAN: JANGAN LAKUKAN INI DI APLIKASI PRODUKSI! SIMPAN KREDENSIAL DI VARIABEL LINGKUNGAN.**
const MONGODB_URI = 'mongodb://localhost:27017/nglcopy'; // Ganti dengan string koneksi Anda

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Terhubung ke MongoDB'))
  .catch(err => console.error('Gagal terhubung ke MongoDB', err));

// Definisikan Skema Pesan
const messageSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname)));

// Middleware untuk autentikasi sederhana (HANYA UNTUK CONTOH)
const requireAuth = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/view');
  }
};

// Route untuk halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route untuk halaman inbox
app.get('/inbox', requireAuth, async (req, res) => {
  try {
    // Ambil pesan dari database
    const messages = await Message.find().sort({ createdAt: -1 });

    // Kirim data pesan ke inbox.html (perlu penanganan sisi klien)
    res.sendFile(path.join(__dirname, 'inbox.html'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan saat mengambil pesan.');
  }
});

// Route untuk halaman "view" (login)
app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'view.html'));
});

app.post('/view', (req, res) => {
  const password = req.body.pass;

  if (password === "rahasia") {
    req.session.isAuthenticated = true;
    res.redirect('/inbox');
  } else {
    res.sendFile(path.join(__dirname, 'view.html'));
  }
});

// Route untuk menampilkan halaman "Send message"
app.get('/send', (req, res) => {
  res.sendFile(path.join(__dirname, 'send.html'));
});

// Route untuk memproses formulir "Send message"
app.post('/send/inProgress', async (req, res) => {
  const messageContent = req.body.message;

  try {
    // Simpan pesan ke database
    const newMessage = new Message({ content: messageContent });
    await newMessage.save();
    res.redirect('/send');

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan saat menyimpan pesan.');
  }
});

app.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, 'create.html'));
});

// Menggunakan Session
const session = require('express-session');

app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true
}));

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
