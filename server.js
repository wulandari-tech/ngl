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
app.get('/wanzbrayy', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html')); // Kirim file index.html
});
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
        const newData = { id, judul, kode, timestamp: id, copyCount: 0 }; // Tambah copyCount
        data.kode.push(newData);
        await simpanData(data);
        res.status(201).json(newData);
    } catch (error) { res.status(500).json({ message: 'Gagal menyimpan kode.' }); }
});

app.delete('/api/kode/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        data.kode = data.kode.filter(item => item.id !== id);
        await simpanData(data);
        res.status(200).json({ message: 'Kode berhasil dihapus.' });
    } catch (error) { res.status(500).json({ message: 'Gagal menghapus kode.' }); }
});
app.post('/api/kode/:id/copy', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        const kodeItem = data.kode.find(item => item.id === id);
        if (!kodeItem) { return res.status(404).json({ message: 'Kode tidak ditemukan.' }); }

        kodeItem.copyCount++;
        await simpanData(data);
        res.status(200).json({ message: 'Copy count updated.', count: kodeItem.copyCount });
    } catch (error) { res.status(500).json({ message: 'Gagal update copy count.' }); }
});
app.get('/api/files', async (req, res) => {
    try {
        const data = await bacaData();
        const fileData = data.files.map(item => ({ id: item.id, originalname: item.originalname, judul: item.judul, timestamp: item.timestamp, downloadCount: item.downloadCount })); // Sertakan downloadCount
        res.json(fileData);
    } catch (error) { res.status(500).json({ message: 'Gagal membaca data file.' }); }
});

app.post('/api/files', async (req, res) => {
    const { originalname, file, judul } = req.body;
    if (!originalname || !file || !judul) { return res.status(400).json({ message: 'Nama file, data file, dan judul diperlukan.' }); }
    try {
        const data = await bacaData();
        const id = Date.now();
        const newFileData = { id, originalname, file, judul, timestamp: id, downloadCount: 0 }; // Tambah downloadCount
        data.files.push(newFileData);
        await simpanData(data);
        res.status(201).json({ id, originalname, judul });
    } catch (error) { res.status(500).json({ message: 'Gagal menyimpan file.' }); }
});

app.get('/api/files/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        const fileData = data.files.find((item) => item.id === id);
        if (!fileData) { return res.status(404).json({ message: 'File tidak ditemukan.' }); }
        res.status(200).json(fileData);
    } catch (error) { console.error(error); res.status(500).json({ message: 'Gagal mengambil file.' }); }
});

app.delete('/api/files/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        data.files = data.files.filter(item => item.id !== id);
        await simpanData(data);
        res.status(200).json({ message: 'File berhasil dihapus.' });
    } catch (error) { res.status(500).json({ message: 'Gagal menghapus file.' }); }
});

// Endpoint untuk meningkatkan downloadCount
app.post('/api/files/:id/download', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const data = await bacaData();
        const fileItem = data.files.find(item => item.id === id);

        if (!fileItem) { return res.status(404).json({ message: 'File tidak ditemukan.' }); }

        fileItem.downloadCount++;
        await simpanData(data);
        res.status(200).json({ message: 'Download count updated.', count: fileItem.downloadCount });
    } catch (error) { res.status(500).json({ message: 'Gagal update download count.' }); }
});

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
