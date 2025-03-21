const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer'); // Jika Anda menggunakan upload
const { v4: uuidv4 } = require('uuid'); // Jika Anda menggunakan upload

const app = express();
const port = 3000;

// --- Fungsi Bantu ---

async function bacaData() {
    try {
        const data = await fs.readFile('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const initialData = { kode: [], files: [] };
            console.warn('data.json not found, creating a new one.');
            await simpanData(initialData);
            return initialData;
        }
        console.error(error);
        throw error;
    }
}

async function simpanData(data) {
    try {
        await fs.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing to data.json", error);
        throw error;
    }
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// --- Konfigurasi Multer (HANYA JIKA ANDA MENGGUNAKAN UPLOAD) ---
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        } catch (err) {}
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });


// --- Middleware ---
app.use(express.json({ limit: '5mb' })); // Sesuaikan
app.use(express.static(__dirname));

// --- Routing (Endpoints) ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- Endpoint Kode ---
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
    if (typeof judul !== 'string' || typeof kode !== 'string') {
        return res.status(400).json({ message: 'Judul dan kode harus berupa string.' });
    }
    if (judul.length > 255 || kode.length > 65535) {
        return res.status(400).json({ message: 'Judul atau kode terlalu panjang.' });
    }
    try {
        const data = await bacaData();
        const id = Date.now();
        const slug = slugify(judul); // Buat slug dari judul
        const newData = { id, judul, kode, timestamp: id, copyCount: 0, likes: 0, comments: [], likedBy: [], copiedBy: [], slug }; // Tambah slug
        data.kode.push(newData);
        await simpanData(data);
        res.status(201).json(newData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menyimpan kode.', error: error.message || error });
    }
});

app.delete('/api/kode/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const index = data.kode.findIndex(item => item.id === id);
        if (index === -1) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }
        data.kode.splice(index, 1);
        await simpanData(data);
        res.json({ message: 'Kode berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus kode.', error: error.message || error });
    }
});

app.post('/api/kode/:id/copy', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ip = req.ip;
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }
        if (kodeItem.copiedBy.includes(ip)) {
            return res.status(400).json({ message: 'Anda sudah pernah menyalin kode ini.' });
        }
        kodeItem.copyCount++;
        kodeItem.copiedBy.push(ip);
        await simpanData(data);
        res.json({ message: 'Copy count berhasil ditingkatkan.', copyCount: kodeItem.copyCount, copied: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal meningkatkan copy count.', error: error.message || error });
    }
});

app.post('/api/kode/:id/like', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ip = req.ip;
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }
        if (kodeItem.likedBy.includes(ip)) {
            return res.status(400).json({ message: 'Anda sudah pernah menyukai kode ini.' });
        }
        kodeItem.likes++;
        kodeItem.likedBy.push(ip);
        await simpanData(data);
        res.json({ message: 'Like berhasil ditambahkan.', likes: kodeItem.likes, liked: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan like.', error: error.message || error });
    }
});

app.get('/api/kode/:id/comments', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }
        res.json(kodeItem.comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil komentar.', error: error.message || error });
    }
});

app.post('/api/kode/:id/comments', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { author, text } = req.body;
    if (!author || !text) { return res.status(400).json({ message: 'Nama dan komentar diperlukan.' }); }
    if (typeof author !== 'string' || typeof text !== 'string') {
        return res.status(400).json({ message: 'Nama dan komentar harus string.' });
    }
    if (author.length > 255 || text.length > 65535) {
        return res.status(400).json({ message: 'Nama atau text terlalu panjang.' });
    }
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }
        const newComment = { id: Date.now(), author, text, timestamp: Date.now() };
        kodeItem.comments.push(newComment);
        await simpanData(data);
        res.status(201).json(newComment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menambahkan komentar.', error: error.message || error });
    }
});

// SHARE URL (MODIFIKASI)
app.get('/api/kode/:id/share', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }
        const slug = kodeItem.slug; // Ambil slug dari data
        const shareUrl = `${req.protocol}://${req.get('host')}/kode/${id}/${slug}`; // Buat URL
        res.json({ shareUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal membuat URL share.', error: error.message || error });
    }
});

// Route untuk menampilkan detail kode (berdasarkan slug)
app.get('/kode/:id/:slug', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const slug = req.params.slug;
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id && item.slug === slug); // Cari berdasarkan ID *dan* slug
        if (!kodeItem) {
            return res.status(404).json({ message: 'Kode tidak ditemukan.' });
        }
        res.json(kodeItem); // Kirim data kode sebagai JSON

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil detail kode.', error: error.message || error });
    }
});

// --- Endpoint File ---
app.get('/api/files', async (req, res) => {
    try {
        const data = await bacaData();
        const files_safe = data.files.map(x => ({
            id: x.id,
            filename: x.filename,
            timestamp: x.timestamp,
            likes: x.likes,
            size: x.size,
        }));
        res.json(files_safe);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil daftar file.', error: error.message || error });
    }
});

//Hanya Jika menggunakan multer
app.post('/api/files', upload.single('file'), async (req, res) => {
    if (!req.file) { return res.status(400).json({ message: 'Tidak ada file yang diupload.' }); }
     const judulFile = req.body.judul;
     if(!judulFile) {
        return res.status(400).json({message: "Judul File tidak boleh kosong"});
     }
    try {
        const data = await bacaData();
        const newFile = {
            id: Date.now(),
            filename: req.file.originalname,
            path: path.relative(__dirname, req.file.path),
            timestamp: Date.now(),
            likes: 0,
            size: req.file.size,
            likedBy: [],
            slug: slugify(req.file.originalname), // Tambahkan slug untuk file
            judul: judulFile
        };
        data.files.push(newFile);
        await simpanData(data);
        res.status(201).json(newFile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengupload file.', error: error.message || error });
    }
});


app.get('/api/files/:id', async (req, res) => {
   const id = parseInt(req.params.id, 10);
    try{
        const data = await bacaData();
        const theFile = data.files.find(x => x.id === id);
        if(!theFile) {
            return res.status(404).json({ message: 'file tidak ditemukan' });
        }

        res.json({
                id: theFile.id,
                filename: theFile.filename,
                timestamp: theFile.timestamp,
                likes: theFile.likes,
                size: theFile.size,
        });

    } catch(error){
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil detail file.', error: error.message || error });
    }
});

//Hanya jika menggunakan Multer
app.delete('/api/files/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const index = data.files.findIndex(item => item.id === id);
        if (index === -1) { return res.status(404).json({ message: 'File tidak ditemukan.' }); }
        const file = data.files[index];
        const filePath = path.join(__dirname, file.path);
        try {
            await fs.unlink(filePath);
        } catch (unlinkError) {
            if (unlinkError.code !== 'ENOENT') {
                console.error('Error deleting file from filesystem:', unlinkError);
            }
        }
        data.files.splice(index, 1);
        await simpanData(data);
        res.json({ message: 'File berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus file.', error: error.message || error });
    }
});


//Hanya Jika Menggunakan multer
/*
app.post('/api/files/:id/download', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const file = data.files.find(item => item.id === id);
        if (!file) { return res.status(404).json({ message: 'File tidak ditemukan.' }); }
        const filePath = path.join(__dirname, file.path);
        res.download(filePath, file.filename, (err) => {
            if (err) {
                console.error("Error during download:", err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Gagal mendownload file.' });
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memproses download.', error: error.message || error });
    }
});
*/
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

// SHARE FILE (MODIFIKASI)
app.get('/api/files/:id/share', async(req,res)=>{
    const id = parseInt(req.params.id, 10);
    try {
        const data = await bacaData();
        const theFile = data.files.find(x => x.id === id);
        if(!theFile) {
            return res.status(404).send("file tidak ditemukan");
        }
        const slug = theFile.slug; // Ambil slug
        const shareUrl = `${req.protocol}://${req.get('host')}/files/${id}/${slug}`; // Buat URL
        res.json({shareUrl});

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: "Gagal generate link share", error: error.message || error});
    }
});

// Route untuk menampilkan detail file (jika Anda punya)
app.get('/files/:id/:slug', async (req, res) => {
     const id = parseInt(req.params.id, 10);
    const slug = req.params.slug;
    try {
        const data = await bacaData();

        const theFile = data.files.find(x => x.id === id && x.slug === slug); // Cari by ID *and* slug
        if(!theFile) {
            return res.status(404).send('file tidak ditemukan');
        }
        res.json(theFile); // Return file details

    } catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal load file', error:error.message || error });
    }
});

// --- DOWNLOAD LOGIC (PENTING!) ---

app.get('/download/:id/:slug', async (req, res) => { // Gunakan route yang berbeda, /download/:id/:slug
    const id = parseInt(req.params.id, 10);
    const slug = req.params.slug;

    try {
        const data = await bacaData();
        const file = data.files.find(item => item.id === id && item.slug === slug); // Find by ID *and* slug
        if (!file) {
            return res.status(404).send('File not found.'); // Lebih baik send() daripada json() untuk error sederhana
        }

        const filePath = path.join(__dirname, file.path);

        // Cek apakah file benar-benar ada di sistem file
        try {
            await fs.access(filePath); // Cek keberadaan file.  fs.access *lebih baik* daripada fs.exists (deprecated)
        } catch (err) {
            console.error("File does not exist on the filesystem:", filePath);
            return res.status(404).send('File not found on server.');
        }
        res.download(filePath, file.filename, (err) => {
            if (err) {
                // Tangani error *setelah* mencoba mengirim header
                console.error("Error during download:", err);
                if (!res.headersSent) {  // Periksa apakah header sudah dikirim
                    res.status(500).send('Failed to download file.');
                }
            }
        });

    } catch (error) {
        console.error("Error in download route:", error);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    }
});


app.listen(port, () => { console.log(`Server berjalan di http://localhost:${port}`); });
