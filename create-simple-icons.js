// Simple icon generator - creates basic blue icons with dollar sign
const Jimp = require('jimp');

async function createIcons() {
    try {
        console.log('Creating simple icons...\n');
        
        // Create 192x192 - simple blue background
        const icon192 = await Jimp.create(192, 192);
        icon192.scan(0, 0, 192, 192, function (x, y, idx) {
            this.bitmap.data[idx] = 66;     // R - #4285f4
            this.bitmap.data[idx + 1] = 133; // G
            this.bitmap.data[idx + 2] = 244; // B
            this.bitmap.data[idx + 3] = 255; // A
        });
        await icon192.writeAsync('public/icon-192.png');
        console.log('✅ Created icon-192.png');
        
        // Create 512x512 - simple blue background
        const icon512 = await Jimp.create(512, 512);
        icon512.scan(0, 0, 512, 512, function (x, y, idx) {
            this.bitmap.data[idx] = 66;     // R - #4285f4
            this.bitmap.data[idx + 1] = 133; // G
            this.bitmap.data[idx + 2] = 244; // B
            this.bitmap.data[idx + 3] = 255; // A
        });
        await icon512.writeAsync('public/icon-512.png');
        console.log('✅ Created icon-512.png');
        
        console.log('\n🎉 Simple blue icons created in public/ folder!');
        console.log('Icons are solid blue (#4285f4) - simple and clean.');
        
    } catch (error) {
        console.error('Error:', error.message);
        console.log('\n💡 Alternative: Open public/generate-icons.html in your browser');
        console.log('   It will generate icons with a dollar sign automatically.');
    }
}

createIcons();
