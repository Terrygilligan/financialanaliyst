// Simple icon generator using Node.js
// This creates simple PNG icons programmatically
// Run: node create-icons-simple.js

const fs = require('fs');
const path = require('path');

console.log('Creating simple PWA icons...\n');

// Since we can't create PNG files directly without canvas library,
// we'll create a simple script that uses an online service or manual creation
// OR we can use the HTML generator

// For now, let's create a better HTML generator that's easier to use
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Generate Icons</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 20px; }
        canvas { border: 1px solid #ccc; margin: 10px; }
        button { padding: 15px 30px; font-size: 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #3367d6; }
    </style>
</head>
<body>
    <h1>💰 Generate PWA Icons</h1>
    <p>Click the button below to generate and download both icon files.</p>
    <canvas id="c192" width="192" height="192"></canvas>
    <canvas id="c512" width="512" height="512"></canvas>
    <br><br>
    <button onclick="generate()">Generate & Download Icons</button>
    <p id="msg"></p>
    <script>
        function draw(canvas, size) {
            const ctx = canvas.getContext('2d');
            // Blue gradient background
            const grad = ctx.createLinearGradient(0, 0, size, size);
            grad.addColorStop(0, '#4285f4');
            grad.addColorStop(1, '#3367d6');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, size, size);
            // White dollar sign
            ctx.fillStyle = '#fff';
            ctx.font = 'bold ' + (size * 0.5) + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', size/2, size/2);
        }
        function download(canvas, name) {
            canvas.toBlob(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = name;
                a.click();
            });
        }
        function generate() {
            const c192 = document.getElementById('c192');
            const c512 = document.getElementById('c512');
            draw(c192, 192);
            draw(c512, 512);
            download(c192, 'icon-192.png');
            setTimeout(() => download(c512, 'icon-512.png'), 300);
            document.getElementById('msg').textContent = '✅ Icons downloaded! Move them to the public/ folder.';
        }
        // Preview on load
        window.onload = () => {
            draw(document.getElementById('c192'), 192);
            draw(document.getElementById('c512'), 512);
        };
    </script>
</body>
</html>`;

// Write the improved HTML generator
fs.writeFileSync(path.join(__dirname, 'public', 'generate-icons-simple.html'), htmlContent);

console.log('✅ Created icon generator at: public/generate-icons-simple.html');
console.log('\n📋 Instructions:');
console.log('1. Open public/generate-icons-simple.html in your browser');
console.log('2. Click "Generate & Download Icons"');
console.log('3. Move the downloaded files (icon-192.png and icon-512.png) to the public/ folder');
console.log('\nOr use the existing generator: public/generate-icons.html\n');
