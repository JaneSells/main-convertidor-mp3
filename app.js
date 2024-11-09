const path = require('path');
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const { marked } = require('marked'); // Correct way to import 'marked'
const multer = require('multer'); // Import 'multer' for file uploads
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine and static files
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configure Multer for file uploads (Markdown + Thumbnail)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'thumbnail') {
            cb(null, 'public/thumbnails'); // Save thumbnails in 'public/thumbnails'
        } else {
            cb(null, 'posts'); // Save markdown files in the 'posts' directory
        }
    },
    filename: (req, file, cb) => {
        const fileName = file.originalname.toLowerCase().split(' ').join('-');
        cb(null, fileName);
    }
});
const upload = multer({ storage: storage });

// Home route
app.get('/', (req, res) => {
    res.render("index");
});

// Blog listing route
app.get('/blog', (req, res) => {
    try {
        const postsDir = path.join(__dirname, 'posts');
        const files = fs.readdirSync(postsDir);

        const posts = files.map(file => {
            const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
            const parts = content.split('---').slice(1);

            if (parts.length < 2) throw new Error(`Invalid markdown format in file: ${file}`);

            const metadata = parts[0].trim();
            const body = parts[1].trim();
            const meta = Object.fromEntries(
                metadata.split('\n').map(line => {
                    const [key, ...value] = line.split(': ');
                    return [key.trim(), value.join(': ').trim()];
                })
            );

            // Include thumbnail path if it exists in metadata
            const thumbnailPath = meta.thumbnail.startsWith("http") 
    ? meta.thumbnail 
    : `/thumbnails/${meta.thumbnail}`;

            return { ...meta, body, thumbnail: thumbnailPath, fileName: file.replace('.md', '') };
        });

        res.render('blog', { posts });
    } catch (error) {
        console.error("Error loading blog posts:", error);
        res.status(500).send("Internal Server Error: Failed to load blog posts.");
    }
});


// Blog post detail route
app.get('/blog/:slug', (req, res) => {
    const postFile = `${req.params.slug}.md`;
    const filePath = path.join(__dirname, 'posts', postFile);

    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parts = content.split('---').slice(1);

            if (parts.length < 2) throw new Error(`Invalid markdown format in file: ${postFile}`);

            const metadata = parts[0].trim();
            const body = parts[1].trim();
            const meta = Object.fromEntries(
                metadata.split('\n').map(line => {
                    const [key, ...value] = line.split(': ');
                    return [key.trim(), value.join(': ').trim()];
                })
            );

            const htmlContent = marked(body);
            res.render('post', { ...meta, content: htmlContent });
        } else {
            res.status(404).send('Post not found');
        }
    } catch (error) {
        console.error("Error loading blog post:", error);
        res.status(500).send("Internal Server Error: Failed to load blog post.");
    }
});

// Admin route to upload markdown and thumbnail
app.post('/admin/upload', upload.fields([{ name: 'markdownFile' }, { name: 'thumbnail' }]), (req, res) => {
    const markdownFile = req.files['markdownFile'][0];
    const thumbnailFile = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;

    // Insert the thumbnail filename in markdown metadata if uploaded
    if (thumbnailFile) {
        const markdownPath = path.join(__dirname, 'posts', markdownFile.filename);
        const content = fs.readFileSync(markdownPath, 'utf-8');
        const newContent = content.replace(
            '---\n', 
            `---\nthumbnail: ${thumbnailFile.filename}\n`
        );
        fs.writeFileSync(markdownPath, newContent, 'utf-8');
    }

    res.redirect('/admin'); // Redirect to the admin panel after upload
});

// Start server
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
