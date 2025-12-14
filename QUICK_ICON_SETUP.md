# Quick Icon Setup - 2 Minutes

## Easiest Method: Use the HTML Generator

1. **Open the generator**: Double-click `public/generate-icons.html` (or open in browser)
2. **Click the button**: "Generate & Download Icons"
3. **Move files**: Take the downloaded `icon-192.png` and `icon-512.png` from your Downloads folder
4. **Place in public folder**: Move them to `c:\Users\terry\Desktop\financialAnalyst\public\`

That's it! The icons will be simple blue squares with a white dollar sign ($).

---

## Alternative: Manual Creation

If you prefer, create simple icons using any image editor:
- **Size**: 192x192 pixels and 512x512 pixels
- **Background**: Blue (#4285f4)
- **Icon**: White dollar sign ($) in the center
- **Format**: PNG
- **Save as**: `icon-192.png` and `icon-512.png` in the `public/` folder

---

## Verify Icons Are Added

After adding the icons, check:
```bash
dir public\icon-*.png
```

You should see:
- `icon-192.png`
- `icon-512.png`

Then deploy:
```bash
firebase deploy --only hosting --project financialanaliyst
```
