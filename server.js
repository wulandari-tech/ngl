const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' })); // Tingkatkan limit untuk data JSON (untuk base64)
app.use(express.static(__dirname));

// --- Endpoint Kode (tidak banyak berubah) ---

app.get('/api/kode', async (req, res) => {
    try {
        const data = await bacaData();
        res.json(data.kode); // Hanya kirim array kode
    } catch (error) {
        res.status(500).json({ message: 'Gagal membaca data kode.' });
    }
});

app.post('/api/kode', async (req, res) => {
    const { kode } = req.body;
    if (!kode) {
        return res.status(400).json({ message: 'Kode tidak boleh kosong.' });
    }
    try {
        const data = await bacaData();
        const id = Date.now();
        const newData = { id, kode, timestamp: id };
        data.kode.push(newData); // Masukkan ke array kode
        await simpanData(data);
        res.status(201).json(newData);
    } catch (error) {
        res.status(500).json({ message: 'Gagal menyimpan kode.' });
    }
});

app.delete('/api/kode/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        data.kode = data.kode.filter(item => item.id !== id); // Filter array kode
        await simpanData(data);
        res.status(200).json({ message: 'Kode berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus kode.' });
    }
});

// --- Endpoint File (berubah total) ---

app.get('/api/files', async (req, res) => {
    try {
        const data = await bacaData();
        // Kirim data file yang relevan (id, originalname, timestamp)
        const fileData = data.files.map(item => ({
            id: item.id,
            originalname: item.originalname,
            timestamp: item.timestamp
        }));
        res.json(fileData);

    } catch (error) {
        res.status(500).json({ message: 'Gagal membaca data file.' });
    }
});

app.post('/api/files', async (req, res) => {
    const { originalname, file } = req.body; // Ambil originalname dan data base64

    if (!originalname || !file) {
        return res.status(400).json({ message: 'Nama file dan data file diperlukan.' });
    }

    try {
        const data = await bacaData();
        const id = Date.now();
        const newFileData = { id, originalname, file, timestamp: id }; // Simpan semua
        data.files.push(newFileData);
        await simpanData(data);
        res.status(201).json({ id, originalname }); // Kirim kembali ID dan nama file
    } catch (error) {
        res.status(500).json({ message: 'Gagal menyimpan file.' });
    }
});

// Endpoint untuk Mendapatkan File Tertentu untuk Didownload
app.get('/api/files/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const data = await bacaData();
    const fileData = data.files.find((item) => item.id === id);

    if (!fileData) {
      return res.status(404).json({ message: 'File tidak ditemukan.' });
    }
    // Kirim data yang lengkap
    res.status(200).json(fileData);

  } catch (error) {
     console.error(error); // Log error di server
    res.status(500).json({ message: 'Gagal mengambil file.' });
  }
});

app.delete('/api/files/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        data.files = data.files.filter(item => item.id !== id); // Filter array files
        await simpanData(data);
        res.status(200).json({ message: 'File berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus file.' });
    }
});

// --- Fungsi Bantu (sedikit perubahan) ---
async function bacaData() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Jika file belum ada, buat struktur data awal
            return { kode: [], files: [] };
        }
        throw error;
    }
}

async function simpanData(data) {
    await fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8');
}

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
