// ═══════════════════════════════════════════════════════
// fetch-gallery.js
// Fetches all images from a Cloudinary folder and writes
// a gallery entry to gallery-output.json
//
// Setup:
//   npm install cloudinary
//
// Usage:
//   node fetch-gallery.js "Nike — Just Do It" nike
//
//   arg 1 = gallery title (what shows on the site)
//   arg 2 = cloudinary folder name (the folder you created on cloudinary)
// ═══════════════════════════════════════════════════════
const cloudinary = require('cloudinary').v2;
const fs         = require('fs');
const path       = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


// ── Your Cloudinary credentials ──
// Find these at cloudinary.com → Dashboard
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,  // e.g. 'marshallryan'
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Read args from command line ──
const galleryTitle  = process.argv[2];
const folderName    = process.argv[3];

if (!galleryTitle || !folderName) {
    console.error('Usage: node fetch-gallery.js "Gallery Title" folder-name');
    process.exit(1);
}

async function fetchGallery() {
    console.log(`Fetching images from folder: ${folderName} ...`);

    // Get all images in the specified Cloudinary folder
    const result = await cloudinary.search
        .expression(`folder:${folderName}`)
        .sort_by('public_id', 'asc') // alphabetical order
        .max_results(100)
        .execute();

    if (!result.resources.length) {
        console.error(`No images found in folder "${folderName}"`);
        process.exit(1);
    }

    // Build optimized URLs — q_auto compresses, w_800 resizes for web
    const images = result.resources.map(resource =>
        cloudinary.url(resource.public_id, {
            quality: 'auto',
            width: 800,
            crop: 'limit',
            fetch_format: 'auto' // serves WebP to browsers that support it
        })
    );

    const gallery = {
        title: galleryTitle,
        images
    };

    // Write to gallery-output.json
    const outputPath = path.join(__dirname, 'gallery-output.json');

    // If file already exists, append to the array
    let existing = [];
    if (fs.existsSync(outputPath)) {
        existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        if (!Array.isArray(existing)) existing = [existing];
    }

    existing.push(gallery);
    fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2));

    console.log(`✓ ${images.length} images fetched`);
    console.log(`✓ Written to gallery-output.json`);
    console.log(`\nPaste the contents of gallery-output.json into the "galleries" array in projects.json`);
}

fetchGallery().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});