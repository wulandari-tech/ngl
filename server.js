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

// IMPLEMENTASI Endpoint yang Belum Lengkap (kode)
app.delete('/api/kode/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10); // Tambahkan radix 10
    try {
        const data = await bacaData();
        const index = data.kode.findIndex(item => item.id === id);
        if (index === -1) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }
        data.kode.splice(index, 1);
        await simpanData(data);
        res.json({ message: 'Kode berhasil dihapus.' });
    } catch (error) {
        console.error(error); // Log error
        res.status(500).json({ message: 'Gagal menghapus kode.', error: error.message || error }); // Kirim pesan error yang lebih detail
    }
});

app.post('/api/kode/:id/copy', async (req, res) => {
     const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }
        kodeItem.copyCount++;
        await simpanData(data);
        res.json({ message: 'Copy count berhasil ditingkatkan.', copyCount: kodeItem.copyCount});
    } catch (error) {
       console.error(error);
        res.status(500).json({ message: 'Gagal meningkatkan copy count.', error: error.message || error });
    }
});

app.post('/api/kode/:id/like', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }
        kodeItem.likes++;
        await simpanData(data);
        res.json({ message: 'Like berhasil ditambahkan.', likes: kodeItem.likes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan like.', error: error.message || error });
    }
});


// Endpoint untuk Komentar (Tidak diubah)
app.get('/api/kode/:id/comments', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }
        res.json(kodeItem.comments); // Kirim komentar dari data.kode
    } catch (error) { res.status(500).json({ message: 'Gagal mengambil komentar.' }); }
});

app.post('/api/kode/:id/comments', async (req, res) => {
    const id = parseInt(req.params.id, 10);
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

// --- Endpoint File --- (Implementasi Tanpa Upload/Download)
//Karena tidak ada folder uploads, dan permintaan untuk tidak menghapus kode awal
//endpoint file hanya akan mengembalikan data dummy atau list kosong.
app.get('/api/files', async (req, res) => {
    try {
        const data = await bacaData();
         res.json(data.files || []); // Mengembalikan array kosong jika files tidak ada
    } catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal membaca data files.', error: error.message || error });
    }

});

app.post('/api/files', async (req, res) => {
     //Karena tidak ada proses upload, maka endpoint ini hanya mengembalikan pesan.
     res.status(501).send('Not Implemented');
});

app.get('/api/files/:id', async (req, res) => {
    //Karena tidak ada detail file yang sebenarnya, berikan response 404
     res.status(404).json({ message: 'File tidak ditemukan.' });
});

app.delete('/api/files/:id', async (req, res) => {
    res.status(501).send('Not Implemented');
});
app.post('/api/files/:id/download', async (req, res) => {
   res.status(501).send('Not Implemented');
});
app.post('/api/files/:id/like', async (req, res) => {
     res.status(501).send('Not Implemented');
});

// --- Fungsi Bantu --- (Modifikasi untuk Auto-Create data.json)
async function bacaData() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Jika file tidak ditemukan, buat data awal dan simpan
            const initialData = { kode: [], files: [] }; // Inisialisasi dengan array kosong
            console.warn('data.json not found, creating a new one.');
            await simpanData(initialData); // Simpan data awal ke file
            return initialData; // Kembalikan data awal
        }
        console.error(error); // Log error lainnya
        throw error; // Re-throw error untuk penanganan di level atas
    }
}

async function simpanData(data) {
     try {
        await fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8');
    } catch(error) {
        console.error("Error writing to data.json", error);
        throw error; // Re-throw untuk penanganan di level atas
    }
}

app.listen(port, () => { console.log(`Server berjalan di http://localhost:${port}`); });
