const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname)); // Ini akan serve file statis (HTML, CSS, JS, gambar, dll.)

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/lan', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- Endpoint Kode ---
app.get('/api/kode', async (req, res) => {
    try {
        const data = await bacaData();
        res.json(data.kode);
    } catch (error) {
        console.error("Error in /api/kode GET:", error);
        res.status(500).json({ message: 'Gagal membaca data kode.', error: error.message });
    }
});

app.post('/api/kode', async (req, res) => {
    const { judul, kode } = req.body;
    if (!judul || !kode) {
        return res.status(400).json({ message: 'Judul dan kode tidak boleh kosong.' });
    }
    try {
        const data = await bacaData();
        const id = Date.now();
        const newData = { id, judul, kode, timestamp: id, copyCount: 0, likes: 0, comments: [] };
        data.kode.push(newData);
        await simpanData(data);
        res.status(201).json(newData);
    } catch (error) {
        console.error("Error in /api/kode POST:", error);
        res.status(500).json({ message: 'Gagal menyimpan kode.', error: error.message });
    }
});

app.delete('/api/kode/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        data.kode = data.kode.filter(item => item.id !== id);
        await simpanData(data);
        res.status(200).json({ message: 'Kode berhasil dihapus.' });
    } catch (error) {
        console.error("Error in /api/kode DELETE:", error);
        res.status(500).json({ message: 'Gagal menghapus kode.', error: error.message });
    }
});

// Endpoint untuk Komentar
app.get('/api/kode/:id/comments', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }
        res.json(kodeItem.comments);
    } catch (error) {
        console.error("Error in /api/kode/:id/comments GET:", error);
        res.status(500).json({ message: 'Gagal mengambil komentar.', error: error.message });
    }
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
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }

        const newComment = { id: Date.now(), author, text, timestamp: Date.now() };
        kodeItem.comments.push(newComment);
        await simpanData(data);
        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error in /api/kode/:id/comments POST:", error);
        res.status(500).json({ message: 'Gagal menambahkan komentar.', error: error.message });
    }
});

// --- Endpoint File ---
app.get('/api/files', async (req, res) => {
    try {
        const data = await bacaData();
        res.json(data.files);
    } catch (error) {
        console.error("Error in /api/files GET:", error);
        res.status(500).json({ message: 'Gagal mengambil daftar file.', error: error.message });
    }
});

// --- Fungsi Bantu ---

// Inisialisasi data.json jika belum ada
async function initDataFile() {
    try {
        await fs.access('data.json'); // Cek apakah file ada
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Jika tidak ada, buat file dengan struktur awal
            await fs.writeFile('data.json', JSON.stringify({ kode: [], files: [] }, null, 2), 'utf8');
            console.log('data.json created.');
        } else {
            console.error('Error accessing data.json:', error);
            // Anda mungkin ingin keluar dari proses di sini, karena tidak bisa membaca/menulis file data.
            process.exit(1); // Keluar dengan kode error
        }
    }
}

async function bacaData() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Seharusnya tidak akan sampai ke sini lagi, karena sudah di-handle di initDataFile
            console.warn("data.json not found (unexpected). Returning empty data.");
            return { kode: [], files: [] };
        } else if (error instanceof SyntaxError) {
            console.error("data.json is corrupt (invalid JSON).  Returning empty data.");
            return { kode: [], files: [] };
        }
        console.error("Unhandled error reading data.json:", error);
        throw error; // Re-throw error yang tidak bisa ditangani
    }
}

async function simpanData(data) {
    try {
        await fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8');
    } catch(error) {
        console.error("Error writing to data.json:", error);
        throw error; // Penting untuk re-throw, agar error ditangani di endpoint
    }
}


// Jalankan inisialisasi *sebelum* server mulai mendengarkan
initDataFile().then(() => {
    app.listen(port, () => {
        console.log(`Server berjalan di http://localhost:${port}`);
    });
}).catch(err => {
    console.error("Failed to initialize data file:", err);
});
