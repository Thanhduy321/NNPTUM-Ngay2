const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Đọc dữ liệu từ db.json
function readDatabase() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Lỗi đọc db.json:', err);
        return { products: [], comments: [] };
    }
}

// Lọc các sản phẩm chưa bị xoá
function getActiveProducts(products) {
    const data = Array.isArray(products) ? products : (products.products || []);
    return data.filter(p => !p.isDeleted);
}

// Lấy tất cả sản phẩm (bao gồm xoá mềm)
function getAllProducts(products) {
    const data = Array.isArray(products) ? products : (products.products || []);
    return data;
}

// Ghi dữ liệu vào db.json
function writeDatabase(data) {
    try {
        fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Lỗi ghi db.json:', err);
        return false;
    }
}

// Lấy ID tối đa từ danh sách sản phẩm
function getMaxProductId(products) {
    const data = Array.isArray(products) ? products : (products.products || []);
    if (data.length === 0) return 0;
    return Math.max(...data.map(p => parseInt(p.id) || 0));
}

// Lấy ID tối đa từ danh sách comments
function getMaxCommentId(comments) {
    const data = Array.isArray(comments) ? comments : [];
    if (data.length === 0) return 0;
    return Math.max(...data.map(c => parseInt(c.id) || 0));
}

const server = http.createServer((req, res) => {
    // Thiết lập CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
    // API lấy danh sách products (chỉ active)
    else if (req.url === '/api/products' && req.method === 'GET') {
        const db = readDatabase();
        const data = Array.isArray(db) ? db : (db.products || []);
        const active = getActiveProducts(data);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(active));
    }
    // API lấy tất cả products (bao gồm xoá mềm)
    else if (req.url === '/api/products-all' && req.method === 'GET') {
        const db = readDatabase();
        const data = Array.isArray(db) ? db : (db.products || []);
        const all = getAllProducts(data);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(all));
    }
    // API tạo product mới
    else if (req.url === '/api/products' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const newProduct = JSON.parse(body);
                const db = readDatabase();
                const products = Array.isArray(db) ? db : (db.products || []);
                
                // Auto-increment ID: maxId + 1
                const maxId = getMaxProductId(products);
                newProduct.id = String(maxId + 1); // Lưu dưới dạng string
                newProduct.isDeleted = false;
                newProduct.creationAt = new Date().toISOString();
                newProduct.updatedAt = new Date().toISOString();
                
                products.push(newProduct);
                const updated = Array.isArray(db) ? products : { ...db, products };
                
                if (writeDatabase(updated)) {
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(newProduct));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Lỗi khi tạo sản phẩm' }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Dữ liệu không hợp lệ' }));
            }
        });
    }
    // API lấy product theo ID
    else if (req.url.startsWith('/api/products/') && req.method === 'GET') {
        const id = req.url.split('/')[3];
        const db = readDatabase();
        const data = Array.isArray(db) ? db : (db.products || []);
        const product = data.find(p => String(p.id) === id && !p.isDeleted);
        
        if (product) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(product));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Sản phẩm không tìm thấy' }));
        }
    }
    // API cập nhật product
    else if (req.url.startsWith('/api/products/') && req.method === 'PUT') {
        const id = req.url.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const updateData = JSON.parse(body);
                const db = readDatabase();
                const products = Array.isArray(db) ? db : (db.products || []);
                const product = products.find(p => String(p.id) === id);
                
                if (product) {
                    Object.assign(product, updateData, {
                        id: product.id,
                        updatedAt: new Date().toISOString()
                    });
                    const updated = Array.isArray(db) ? products : { ...db, products };
                    
                    if (writeDatabase(updated)) {
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify(product));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: 'Lỗi khi cập nhật sản phẩm' }));
                    }
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Sản phẩm không tìm thấy' }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Dữ liệu không hợp lệ' }));
            }
        });
    }
    // API xoá mềm (soft delete)
    else if (req.url.startsWith('/api/products/') && req.method === 'DELETE') {
        const id = req.url.split('/')[3];
        const db = readDatabase();
        const products = Array.isArray(db) ? db : (db.products || []);
        const product = products.find(p => String(p.id) === id);
        
        if (product) {
            product.isDeleted = true;
            product.updatedAt = new Date().toISOString();
            const updated = Array.isArray(db) ? products : { ...db, products };
            if (writeDatabase(updated)) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: 'Sản phẩm đã bị xoá' }));
            } else {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Lỗi khi xoá sản phẩm' }));
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Sản phẩm không tìm thấy' }));
        }
    }
    
    // ===== COMMENTS ROUTES =====
    // API lấy danh sách comments của 1 post
    else if (req.url.startsWith('/api/products/') && req.url.endsWith('/comments') && req.method === 'GET') {
        const postId = req.url.split('/')[3];
        const db = readDatabase();
        const comments = db.comments || [];
        const postComments = comments.filter(c => String(c.postId) === postId);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(postComments));
    }
    // API tạo comment mới
    else if (req.url.startsWith('/api/products/') && req.url.endsWith('/comments') && req.method === 'POST') {
        const postId = req.url.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const newComment = JSON.parse(body);
                const db = readDatabase();
                const comments = db.comments || [];
                
                const maxId = getMaxCommentId(comments);
                newComment.id = String(maxId + 1);
                newComment.postId = postId;
                newComment.createdAt = new Date().toISOString();
                
                comments.push(newComment);
                const updated = { ...db, comments };
                
                if (writeDatabase(updated)) {
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(newComment));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Lỗi khi tạo comment' }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Dữ liệu không hợp lệ' }));
            }
        });
    }
    // API cập nhật comment
    else if (req.url.match(/^\/api\/comments\/\d+$/) && req.method === 'PUT') {
        const commentId = req.url.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const updateData = JSON.parse(body);
                const db = readDatabase();
                const comments = db.comments || [];
                const comment = comments.find(c => String(c.id) === commentId);
                
                if (comment) {
                    Object.assign(comment, updateData, {
                        id: comment.id,
                        postId: comment.postId,
                        updatedAt: new Date().toISOString()
                    });
                    const updated = { ...db, comments };
                    
                    if (writeDatabase(updated)) {
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify(comment));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: 'Lỗi khi cập nhật comment' }));
                    }
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Comment không tìm thấy' }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Dữ liệu không hợp lệ' }));
            }
        });
    }
    // API xoá comment
    else if (req.url.match(/^\/api\/comments\/\d+$/) && req.method === 'DELETE') {
        const commentId = req.url.split('/')[3];
        const db = readDatabase();
        const comments = db.comments || [];
        const index = comments.findIndex(c => String(c.id) === commentId);
        
        if (index > -1) {
            comments.splice(index, 1);
            const updated = { ...db, comments };
            if (writeDatabase(updated)) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true, message: 'Comment đã bị xoá' }));
            } else {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Lỗi khi xoá comment' }));
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Comment không tìm thấy' }));
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
