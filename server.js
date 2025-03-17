const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Kirim file index.html
});
app.get('/lan', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html')); // Kirim file index.html
});

// --- Endpoint Kode ---
app.get('/api/kode', async (req, res) => {
    try {
        const data = await bacaData();
        res.json(data.kode);
    } catch (error) { res.status(500).json({ message: 'Gagal membaca data kode.' }); }
});

app.post('/api/kode', async (req, res) => {
    const { judul, kode } = req.body;
    if (!judul || !kode) { return res.status(400).json({ message: 'Judul dan kode tidak boleh kosong.' }); }
    try {
        const data = await bacaData();
        const id = Date.now();
        const newData = { id, judul, kode, timestamp: id, copyCount: 0, likes: 0, comments: [] }; // comments di sini
        data.kode.push(newData);
        await simpanData(data);
        res.status(201).json(newData);
    } catch (error) { res.status(500).json({ message: 'Gagal menyimpan kode.' }); }
});

app.delete('/api/kode/:id', async (req, res) => { ... }); // Tidak berubah
app.post('/api/kode/:id/copy', async (req, res) => { ... }); // Tidak berubah
app.post('/api/kode/:id/like', async (req, res) => { ... });  // Tidak berubah

// Endpoint untuk Komentar
app.get('/api/kode/:id/comments', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }
        res.json(kodeItem.comments); // Kirim komentar dari data.kode
    } catch (error) { res.status(500).json({ message: 'Gagal mengambil komentar.' }); }
});

app.post('/api/kode/:id/comments', async (req, res) => {
    const id = parseInt(req.params.id);
    const { author, text } = req.body;

    if (!author || !text) {
        return res.status(400).json({ message: 'Nama dan komentar diperlukan.' });
    }

    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }

        const newComment = { id: Date.now(), author, text, timestamp: Date.now() };
        kodeItem.comments.push(newComment); // Tambah komentar ke data.kode
        await simpanData(data); // Simpan ke data.json!
        res.status(201).json(newComment);
    } catch (error) { res.status(500).json({ message: 'Gagal menambahkan komentar.' }); }
});

// --- Endpoint File ---
app.get('/api/files', async (req, res) => { ... }); // Tidak berubah
app.post('/api/files', async (req, res) => { ... });  // Tidak berubah
app.get('/api/files/:id', async (req, res) => { ... }); // Tidak berubah
app.delete('/api/files/:id', async (req, res) => { ... }); // Tidak berubah
app.post('/api/files/:id/download', async (req, res) => { ... }); // Tidak berubah
app.post('/api/files/:id/like', async (req, res) => { ... });  // Tidak berubah

// --- Fungsi Bantu ---
async function bacaData() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') { return { kode: [], files: [] }; }
        throw error;
    }
}

async function simpanData(data) {
    await fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8');
}

app.listen(port, () => { console.log(`Server berjalan di http://localhost:${port}`); });
