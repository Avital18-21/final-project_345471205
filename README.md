Maison Brell's Paris — HTML, CSS & JavaScript

Maison Brell's Paris is a framework-free e-commerce website built with semantic HTML, CSS and vanilla JavaScript. The project includes a responsive catalog, product pages, search, categories, cart, checkout flow, user registration and login.

The website is designed to run as a static site on GitHub Pages, while keeping the project requirement of using JSONBin for storing and updating user and store data.

Main Technologies

HTML5

CSS3

Vanilla JavaScript

JSONBin REST API

GitHub Pages

Files

index.html — main HTML entry point

style.css — full design, animations, desktop layout and responsive smartphone/tablet layouts

script.js — catalog, search, product details, cart, checkout, account logic and JSONBin connection

server.js — optional local Node.js server for development only

assets/ — images, icons and visual assets

Data And Storage

The project uses JSONBin as the external data storage service.

The website reads and updates data through the JSONBin API, including account actions such as registration and login. Because the deployed website runs on GitHub Pages, the browser connects directly to JSONBin from script.js.

Why There Is No .env On GitHub Pages

In the original local version, the project could use a .env file together with server.js in order to keep the JSONBin Bin ID and Access Key outside the browser.

However, GitHub Pages is static hosting only. It serves HTML, CSS, JavaScript and assets, but it does not run a Node.js server and it cannot read environment variables from a .env file.

For that reason, the deployed GitHub Pages version stores the JSONBin configuration directly inside script.js:

const JSONBIN_BIN_ID = "...";
const JSONBIN_ACCESS_KEY = "...";

This change was required so that registration, login and data updates continue to work after deployment to GitHub Pages.

Local Development

The project can be opened directly in the browser through index.html.

If using the optional local server, run:

node server.js

Then open:

http://localhost:5500

The local server is kept only for development. It is not used by GitHub Pages.

Deployment

The project is deployed with GitHub Pages as a static website.

After committing changes to GitHub, GitHub Pages serves the updated index.html, style.css, script.js and assets/ files.

Demo Account

Email: demo@aurelle.com

Password: Aurelle123

The checkout flow is an academic demonstration. Do not enter a real card number.
