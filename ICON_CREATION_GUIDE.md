# PWA Icon Creation Guide

## Quick Fix: Create Icons

The PWA needs two icon files that are currently missing:
- `public/icon-192.png` (192x192 pixels)
- `public/icon-512.png` (512x512 pixels)

## Option 1: Use Online Icon Generator (Easiest)

1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload a logo or use their generator
3. Download the icons
4. Place them in the `public/` folder as:
   - `icon-192.png`
   - `icon-512.png`

## Option 2: Use the HTML Generator

1. Open `public/create-icons.html` in your browser
2. The icons will auto-generate and download
3. Move the downloaded files to the `public/` folder

## Option 3: Create Manually

Use any image editor (Photoshop, GIMP, Canva, etc.):
1. Create a 192x192 pixel image with your logo/icon
2. Save as `icon-192.png` in `public/` folder
3. Create a 512x512 pixel version
4. Save as `icon-512.png` in `public/` folder

## Option 4: Use Placeholder Icons (Temporary)

For quick testing, you can use simple colored squares:
- Create a blue square (#4285f4) with a white dollar sign or money emoji
- Save at both sizes

## After Creating Icons

1. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting --project financialanaliyst
   ```

2. Test on mobile:
   - Clear browser cache
   - Visit the app
   - Check if "Add to Home Screen" prompt appears

---

**Note**: Icons are required for PWA installation on mobile devices. Without them, the app may not install properly.
