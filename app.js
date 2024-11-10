const path = require('path');
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set the views directory explicitly
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set up static files correctly
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for parsing data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Home route
app.get('/', (req, res) => {
    res.render("index");
});

// Convert to MP3 route
app.post('/convert-mp3', async (req, res) => {
    const url = req.body.videoID;
    let uniqueID;

    // Extract YouTube video ID
    if (url.includes('youtu.be')) {
        uniqueID = (url.match(/youtu\.be\/([^?&]+)/) || [, null])[1];
    } else {
        uniqueID = (url.match(/[?&]v=([^&]*)/) || [, null])[1];
    }

    // Validate and process the ID
    if (!uniqueID) {
        return res.render("index", { success: false, message: "Please enter a valid YouTube URL" });
    }

    try {
        // Fetch from the API using the extracted video ID
        const fetchAPI = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${uniqueID}`, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": process.env.API_KEY,
                "X-RapidAPI-Host": process.env.API_HOST
            }
        });

        const response = await fetchAPI.json();

        // Render the result
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
