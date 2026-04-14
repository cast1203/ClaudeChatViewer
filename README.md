# Claude Chat Viewer

<p align="center">
  <img src="assets/icon.png" alt="Claude Chat Viewer" width="128" height="128">
</p>

<p align="center">
  <strong>A desktop app for managing your Claude conversation history</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows-blue" alt="Platform">
  <img src="https://img.shields.io/badge/Electron-28.0-47848F?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

## 📖 Introduction

Claude Chat Viewer is an Electron-based desktop application that lets you conveniently browse and manage conversation records exported from [Claude](https://claude.ai).

Organize your conversations with categories and tags, and use local AI (Ollama) for automatic classification to easily manage hundreds of conversations.

## ✨ Key Features

### 📁 Multiple File Format Support
- ZIP files (Claude's default export format)
- JSON files
- Folders (batch load multiple JSON files)

### 🏷️ Category & Tag Management
- Assign a category to each conversation (single)
- Assign tags to each conversation (multiple)
- Custom color settings
- Filter by category/tag

### 🤖 AI Auto-Classification (Ollama Integration)
- Automatic conversation classification using local AI
- Single / Sequential / Batch processing modes
- Auto-select from existing categories, auto-create new tags

### 🔍 Search & Filter
- Full-text search (title + content)
- Search term highlighting
- Sort: Newest / Oldest / Name
- Message filter: All / My messages / Claude messages

### 💬 Messenger-Style UI
- Human messages → Right side (purple bubble)
- Claude messages → Left side (gray bubble)
- Dark theme by default

### 🖥️ Convenience Features
- Custom title bar
- Auto-load last opened file
- Right-click context menu (rename, change category, delete)
- Keyboard shortcuts (Ctrl+O, Ctrl+F, Escape)

## 📸 Screenshots

<!-- Add screenshot images here -->
<!-- ![Main Screen](screenshots/main.png) -->
<!-- ![AI Auto-Classification](screenshots/ai-classify.png) -->

## 🚀 Installation

### Option 1: Download Release
Download the latest installer from the [Releases](../../releases) page.

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-chat-viewer.git
cd claude-chat-viewer

# Install dependencies
npm install

# Run in development mode
npm start

# Build (Windows)
npm run build
```

## 🛠️ Tech Stack

- **Electron** - Cross-platform desktop app framework
- **sql.js** - WebAssembly-based SQLite (stores category/tag data)
- **node-fetch** - Ollama API communication
- **adm-zip** - ZIP file processing

## 📋 How to Use

### Basic Usage

1. Export conversations from Claude.ai (Settings → Export Data)
2. Launch the app and open a ZIP file or folder
3. Click on a conversation in the list to view

### AI Auto-Classification

1. Install and run [Ollama](https://ollama.ai)
2. Download a model: `ollama pull gemma2` or `ollama pull llama3.2`
3. Click the 🤖 button in the app
4. Test connection → Select model → Start classification

### Data Storage Location

Category/tag data is stored in SQLite format at `C:\Database\claude-chat-viewer.db`.

## ⌨️ Keyboard Shortcuts

| Shortcut | Function |
|----------|----------|
| `Ctrl + O` | Open file |
| `Ctrl + F` | Focus search box |
| `Escape` | Close modal / Clear search |
| `F12` | Open developer tools |

## 🤝 Contributing

Bug reports, feature suggestions, and PRs are all welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - Free to use, modify, and distribute.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) - Claude AI
- [Ollama](https://ollama.ai) - Local AI runtime environment
- [Electron](https://electronjs.org) - Desktop app framework

---

<p align="center">
  Made with ❤️ for Claude users
</p># ClaudeChatViewer
A desktop app for managing your Claude conversation history
