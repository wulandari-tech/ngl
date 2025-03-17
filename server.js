const express = require('express');
const fs = require('fs').promises;
const path = require('path');
// ... (jika ada kode multer atau lainnya) ...

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));  // Sesuaikan jika perlu
app.use(express.static(__dirname));

// ... (endpoint /, /admin, dll.) ...

// --- Endpoint Kode ---

// ... (GET /api/kode, POST /api/kode) ...
app.get('/api/kode', async (req, res) => {
    try {
        const data = await bacaData();
        res.json(data.kode);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal membaca data kode.', error: error.message || error });
    }
});

app.post('/api/kode', async (req, res) => {
    const { judul, kode } = req.body;
    if (!judul || !kode) { return res.status(400).json({ message: 'Judul dan kode tidak boleh kosong.' }); }
    try {
        const data = await bacaData();
        const id = Date.now();
        const newData = { id, judul, kode, timestamp: id, copyCount: 0, likes: 0, comments: [],likedBy:[],copiedBy:[] }; // comments di sini
        data.kode.push(newData);
        await simpanData(data);
        res.status(201).json(newData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menyimpan kode.',error:error.message || error }); }
});
// DELETE /api/kode/:id
app.delete('/api/kode/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
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
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus kode.', error: error.message || error });
    }
});

// POST /api/kode/:id/copy - Copy (tanpa spam)
app.post('/api/kode/:id/copy', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ip = req.ip; // Ambil IP address dari request

    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }

        // Cek apakah IP ini sudah pernah copy
        if (kodeItem.copiedBy.includes(ip)) {
            return res.status(400).json({ message: 'Anda sudah pernah menyalin kode ini.' });
        }

        kodeItem.copyCount++;
        kodeItem.copiedBy.push(ip); // Tambahkan IP ke array copiedBy
        await simpanData(data);
        res.json({ message: 'Copy count berhasil ditingkatkan.', copyCount: kodeItem.copyCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal meningkatkan copy count.', error: error.message || error });
    }
});

// POST /api/kode/:id/like - Like (tanpa spam)
app.post('/api/kode/:id/like', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ip = req.ip; // Ambil IP address

    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }

        // Cek apakah IP ini sudah pernah like
        if (kodeItem.likedBy.includes(ip)) {
            return res.status(400).json({ message: 'Anda sudah pernah menyukai kode ini.' });
        }

        kodeItem.likes++;
        kodeItem.likedBy.push(ip); // Tambahkan IP ke array likedBy
        await simpanData(data);
        res.json({ message: 'Like berhasil ditambahkan.', likes: kodeItem.likes, liked: true }); // Tambahkan info liked
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan like.', error: error.message || error });
    }
});

// GET /api/kode/:id/share - Generate URL share
app.get('/api/kode/:id/share', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }

        const slug = slugify(kodeItem.judul);
        const shareUrl = `${req.protocol}://${req.get('host')}/kode/${id}/${slug}`; // Buat URL
        res.json({ shareUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal membuat URL share.', error: error.message || error });
    }
});

// --- Endpoint File (Contoh, sesuaikan jika ada upload) ---
// ... (implementasi endpoint files, dengan logika yang sama untuk likedBy) ...
app.post('/api/files/:id/like', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ip = req.ip;

    try{
        const data = await bacaData();
        const theFile = data.files.find(x => x.id === id);
        if(!theFile) {
            return res.status(404).send("file tidak ditemukan");
        }

        if(theFile.likedBy.includes(ip)) {
             return res.status(400).json({ message: 'Anda sudah pernah menyukai file ini.' });
        }

        theFile.likes++;
        theFile.likedBy.push(ip);
        await simpanData(data);
        res.json({ message: 'Like berhasil ditambahkan.', likes: theFile.likes, liked: true });

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Gagal menyukai file", error:error.message || error });
    }
});

// GET /api/files/:id/share
app.get('/api/files/:id/share', async(req,res)=>{
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const theFile = data.files.find(x => x.id === id);
        if(!theFile) {
            return res.status(404).send("file tidak ditemukan");
        }
        const slug = slugify(theFile.filename);
        const shareUrl = `${req.protocol}://${req.get('host')}/files/${id}/${slug}`; // Buat URL
        res.json({shareUrl});

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Gagal generate link share", error: error.message || error});
    }
});


// --- Fungsi Bantu ---

// ... (bacaData, simpanData, slugify) ...

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
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Ganti spasi dengan -
        .replace(/[^\w\-]+/g, '')       // Hapus karakter non-word dan -
        .replace(/\-\-+/g, '-')         // Ganti multiple - dengan single -
        .replace(/^-+/, '')             // Hapus - di awal
        .replace(/-+$/, '');            // Hapus - di akhir
}
app.listen(port, () => { console.log(`Server berjalan di http://localhost:${port}`); });
