const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Đọc dữ liệu từ db.json
function readDatabase() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Lỗi đọc db.json:', err);
        return [];
    }
}

const server = http.createServer((req, res) => {
    // Thiết lập CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Xử lý request OPTIONS
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Xử lý route Trang Chủ
    if (req.url === '/' && req.method === 'GET') {
        const filePath = path.join(__dirname, 'page.html');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Lỗi: Không thể tải file');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
    } 
    // API lấy danh sách products
    else if (req.url === '/api/products' && req.method === 'GET') {
        const products = readDatabase();
        // Xử lý dữ liệu là mảng
        const data = Array.isArray(products) ? products : (products.products || []);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
    }
    // API lấy product theo ID
    else if (req.url.startsWith('/api/products/') && req.method === 'GET') {
        const id = parseInt(req.url.split('/')[3]);
        const products = readDatabase();
        const data = Array.isArray(products) ? products : (products.products || []);
        const product = data.find(p => p.id === id);
        
        if (product) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(product));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Sản phẩm không tìm thấy' }));
        }
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Không tìm thấy trang');
    }
});

server.listen(PORT, () => {
    console.log(`✓ Server NNPTUD-C5 đang chạy tại http://localhost:${PORT}`);
});
