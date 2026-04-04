# 🍎 Apple TV Like Video Player

🍎 Apple TV-style HTML5 Video Player
A cinematic, smooth, and lightweight custom video player UI.

---

## 📖 Description

A lightweight vanilla JavaScript plugin that enhances native `<video>` elements with an Apple TV-inspired cinematic experience.

It automatically transforms all video elements into a modern, immersive player with smooth animations and smart controls.

---

## 🌐 Live Demo

👉 https://dorafx.github.io/apple-tv-like-player/

---

## ✨ Features

* Apple TV-style UI
* Auto-enhance all `<video>` elements
* Auto-hide controls when idle
* Smooth timeline scrubbing
* Smart volume icon levels
* Fullscreen transition animation
* Keyboard shortcuts support
* Mobile-friendly

---

## 🚀 Usage

```html
<link rel="stylesheet" href="apple-video-player.css">
<script src="apple-video-player.js"></script>

<video src="demo.mp4"></video>
```

No initialization needed.
All video elements will be enhanced automatically.

---

## 🚫 Exclude Videos

If you want to prevent certain `<video>` elements from being enhanced,
just add the attribute:

```html
<video src="bg.mp4" data-atvp-ignore="1"></video>
```

Videos with `data-atvp-ignore="1"` will be ignored by the player.

---

## ⌨️ Shortcuts

| Key   | Action            |
| ----- | ----------------- |
| Space | Play / Pause      |
| Enter | Toggle Fullscreen |

---

## 📦 Installation

Just download or include the files directly.

---

## 📄 License

MIT

---

## 👤 Author

DoraFX

---

## 🌏 中文文档

👉 [查看中文说明 (README_zh.md)](./README_zh.md)
