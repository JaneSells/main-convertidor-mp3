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

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'posts'); // Save uploaded files in the 'posts' directory
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

// About page route
app.get('/about', (req, res) => {
    res.render('about');
});

// Other tool page route
app.get('/other-tool', (req, res) => {
    res.render('other-tool'); // Placeholder for an additional tool page
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

            return { ...meta, body, fileName: file.replace('.md', '') };
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

// Admin route to render the admin panel
app.get('/admin', (req, res) => {
    const postsDir = path.join(__dirname, 'posts');
    const files = fs.readdirSync(postsDir);
    res.render('admin', { files });
});

// Route to handle file upload
app.post('/admin/upload', upload.single('markdownFile'), (req, res) => {
    res.redirect('/admin'); // Redirect to the admin panel after upload
});

// Route to edit an existing post
app.get('/admin/edit/:fileName', (req, res) => {
    const filePath = path.join(__dirname, 'posts', req.params.fileName);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.render('edit', { fileName: req.params.fileName, content });
    } else {
        res.status(404).send('Post not found');
    }
});

app.post('/admin/edit/:fileName', (req, res) => {
    const filePath = path.join(__dirname, 'posts', req.params.fileName);
    fs.writeFileSync(filePath, req.body.content, 'utf-8');
    res.redirect('/admin');
});

// Route to delete an existing post
app.get('/admin/delete/:fileName', (req, res) => {
    const filePath = path.join(__dirname, 'posts', req.params.fileName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    res.redirect('/admin');
});

// Convert to MP3 route
app.post('/convert-mp3', async (req, res) => {
    const url = req.body.videoID;
    let uniqueID;

    // Extract YouTube video ID
    if (url.includes('youtu.be')) {
        uniqueID = (url.match(/youtu\.be\/([^?&]+)/) || [, null])[1];
    } else if (url.includes('/shorts/')) {
        uniqueID = (url.match(/\/shorts\/([^?&]+)/) || [, null])[1];
    } else {
        uniqueID = (url.match(/[?&]v=([^&]*)/) || [, null])[1];
    }

    if (!uniqueID) {
        return res.render("index", { success: false, message: "Please enter a valid YouTube URL" });
    }

    try {
        const fetchAPI = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${uniqueID}`, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": process.env.API_KEY,
                "X-RapidAPI-Host": process.env.API_HOST
            }
        });

        const response = await fetchAPI.json();

        if (response.status === "ok") {
            return res.render("index", {
                success: true,
                song_title: response.title,
                song_link: response.link
            });
        } else {
            return res.render("index", { success: false, message: response.msg });
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.render("index", { success: false, message: "An error occurred. Please try again." });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
