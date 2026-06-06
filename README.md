# Crownstead First-Person Demo

A simple browser-based first-person walking prototype built with plain HTML, CSS, and JavaScript.

## Features

- Fullscreen canvas rendering a simple first-person 3D scene.
- Flat open ground plane with a grid for navigation.
- Mouse-look camera using browser pointer lock.
- Click-to-play flow, with <kbd>Esc</kbd> releasing the mouse naturally through the browser.
- Smooth WASD movement.
- The player is kept at a fixed eye height so they stay on the ground.
- Colorful landmark cubes so movement and turning are easy to see.
- Minimal dark HUD with controls.

## Run locally

You can open `index.html` directly in a browser. No build step or package install is required.

For the most reliable local setup, run a small static server from the project folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

- Click the screen: lock mouse / start playing
- WASD: move
- Mouse: look around
- Esc: unlock mouse
