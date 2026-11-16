# AI Engineering Master Curriculum — course website

Plain HTML/CSS/JS, no build step. Open `index.html` in a browser.

```
index.html          Home
pages/              schedule, modules, assignments, resources, policies, contact
css/style.css       styles (light/dark, print)
js/main.js          nav, theme, search, progress, schedule dates
assets/             original-syllabus.html (download link target)
tools/              parse.mjs + build.mjs regenerate the pages from the syllabus (optional)
```

Regenerate after editing the syllabus: `node tools/parse.mjs assets/original-syllabus.html && node tools/build.mjs`

## Deploy free
- **GitHub Pages:** push this folder to a repo → Settings → Pages → deploy from the `main` branch, root folder.
- **Netlify:** drag the folder onto app.netlify.com/drop (no build command, publish directory `.`).
