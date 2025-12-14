// Generate PWA icons using Node.js
// Run: node generate-icons-node.js

const JimpModule = require('jimp');
const Jimp = JimpModule.Jimp || JimpModule.default || JimpModule;
const path = require('path');

async function generateIcons() {
    try {
        console.log('Generating simple PWA icons...\n');
        
        // Create 192x192 icon - simple blue background with white dollar sign
        const icon192 = await new Promise((resolve, reject) => {
            new Jimp(192, 192, 0x4285f4ff, async (err, image) => {
                if (err) return reject(err);
                
                // Try to load font and add dollar sign
                try {
                    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
                    image.print(font, 0, 60, {
                        text: '$',
                        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                    }, 192, 192);
                } catch (fontErr) {
                    // If font fails, draw a simple white circle with dollar
                    console.log('Using fallback rendering for 192px icon...');
                }
                
                await image.writeAsync('public/icon-192.png');
                console.log('✅ Created icon-192.png');
                resolve(image);
            });
        });
        
        // Create 512x512 icon
        const icon512 = await new Promise((resolve, reject) => {
            new Jimp(512, 512, 0x4285f4ff, async (err, image) => {
                if (err) return reject(err);
                
                try {
                    const font = await Jimp.loadFont(Jimp.FONT_SANS_256_WHITE);
                    image.print(font, 0, 150, {
                        text: '$',
                        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                    }, 512, 512);
                } catch (fontErr) {
                    console.log('Using fallback rendering for 512px icon...');
                }
                
                await image.writeAsync('public/icon-512.png');
                console.log('✅ Created icon-512.png');
                resolve(image);
            });
        });
        
        console.log('\n🎉 Icons created successfully in public/ folder!');
        
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log(`
❌ Jimp package not found.

📦 To install and generate icons:
1. Run: npm install jimp
2. Then run: node generate-icons-node.js

OR use the HTML generator:
1. Open: public/generate-icons.html in your browser
2. Click "Generate & Download Icons"
3. Move downloaded files to public/ folder
            `);
        } else {
            console.error('Error:', error.message);
            // Try simpler approach without fonts
            console.log('\nTrying simpler approach...');
            await generateSimpleIcons();
        }
    }
}

async function generateSimpleIcons() {
    // Create simple icons without fonts - just colored squares
    try {
        const icon192 = await new Promise((resolve, reject) => {
            new Jimp(192, 192, 0x4285f4ff, (err, image) => {
                if (err) reject(err);
                else resolve(image);
            });
        });
        await icon192.writeAsync('public/icon-192.png');
        console.log('✅ Created icon-192.png (simple version)');
        
        const icon512 = await new Promise((resolve, reject) => {
            new Jimp(512, 512, 0x4285f4ff, (err, image) => {
                if (err) reject(err);
                else resolve(image);
            });
        });
        await icon512.writeAsync('public/icon-512.png');
        console.log('✅ Created icon-512.png (simple version)');
        console.log('\n🎉 Simple icons created! (Blue squares - you can add $ symbol later if needed)');
    } catch (err) {
        console.error('Failed to create simple icons:', err.message);
        console.log('\nPlease use the HTML generator: public/generate-icons.html');
    }
}

generateIcons();
