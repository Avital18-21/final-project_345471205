# Maison Brell's Paris — HTML, CSS & JavaScript

This is the framework-free version of the complete store. It uses only semantic HTML, CSS and vanilla JavaScript. Product data, categories, images and reviews are loaded from the DummyJSON REST API. The included vanilla Node.js server keeps the JSONBin Access Key outside the browser.

## Files

- `index.html` — HTML entry point
- `style.css` — full design, animations and responsive smartphone/tablet layouts
- `script.js` — catalog, search, product details, cart, checkout and account logic
- `server.js` — framework-free JavaScript server and secure JSONBin connection
- `assets/favicon.svg` — site icon

## Run

1. Copy `.env.example` to `.env` and insert the JSONBin Bin ID and limited Access Key.
2. Start the included server (Node.js 18+):

```bash
node server.js
```

Then visit `http://localhost:5500`.

## Demo account

- Email: `demo@aurelle.com`
- Password: `Aurelle123`

The checkout is an academic demonstration. Never enter a real card number.
