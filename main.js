const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');

let mainWindow;
let db = null;

// DB 경로 설정
const DB_DIR = 'C:\\Database';
const DB_PATH = path.join(DB_DIR, 'claude-chat-viewer.db');

// sql.js 초기화 및 DB 로드
async function initDatabase() {
  const initSqlJs = require('sql.js');
  
  // WASM 파일 경로 설정
  const wasmPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  
  const SQL = await initSqlJs({
    locateFile: file => wasmPath
  });
  
  // DB 디렉토리 생성
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  
  // 기존 DB 파일이 있으면 로드, 없으면 새로 생성
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#22c55e',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS conversation_categories (
      conversation_id TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (conversation_id, category_id),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS conversation_tags (
      conversation_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (conversation_id, tag_id),
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
  
  saveDatabase();
  console.log('Database initialized at:', DB_PATH);
}

// DB 파일로 저장
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false, // 준비될 때까지 숨김
    frame: false, // 기본 프레임 제거 (커스텀 타이틀바 사용)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
  });

  mainWindow.loadFile('src/index.html');
  
  // 준비되면 최대화하고 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });
  
  // F12로 DevTools 열기
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  saveDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  saveDatabase();
});

// ===== 파일 관련 IPC =====

// 창 제어 IPC
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized();
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'ZIP Files', extensions: ['zip'] },
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('load-zip', async (event, zipPath) => {
  try {
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    const conversations = [];
    
    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.json') && !entry.isDirectory) {
        try {
          const content = entry.getData().toString('utf8');
          const data = JSON.parse(content);
          
          if (Array.isArray(data)) {
            conversations.push(...data);
          } else if (data.uuid || data.id || data.chat_messages) {
            conversations.push(data);
          }
        } catch (e) {
          console.error(`Failed to parse ${entry.entryName}:`, e.message);
        }
      }
    }
    
    return { success: true, conversations };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-folder', async (event, folderPath) => {
  try {
    const conversations = [];
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(folderPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        try {
          const data = JSON.parse(content);
          
          if (Array.isArray(data)) {
            conversations.push(...data);
          } else if (data.uuid || data.id || data.chat_messages) {
            conversations.push(data);
          }
        } catch (e) {
          console.error(`Failed to parse ${file}:`, e.message);
        }
      }
    }
    
    return { success: true, conversations };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-json', async (event, jsonPath) => {
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(content);
    const conversations = Array.isArray(data) ? data : [data];
    
    return { success: true, conversations };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== 카테고리 관련 IPC =====

ipcMain.handle('get-categories', () => {
  const result = db.exec('SELECT * FROM categories ORDER BY name');
  if (result.length === 0) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2],
    created_at: row[3]
  }));
});

ipcMain.handle('add-category', (event, { name, color }) => {
  try {
    db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [name, color]);
    saveDatabase();
    const result = db.exec('SELECT last_insert_rowid()');
    return { success: true, id: result[0].values[0][0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-category', (event, { id, name, color }) => {
  try {
    db.run('UPDATE categories SET name = ?, color = ? WHERE id = ?', [name, color, id]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-category', (event, id) => {
  try {
    db.run('DELETE FROM conversation_categories WHERE category_id = ?', [id]);
    db.run('DELETE FROM categories WHERE id = ?', [id]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== 태그 관련 IPC =====

ipcMain.handle('get-tags', () => {
  const result = db.exec('SELECT * FROM tags ORDER BY name');
  if (result.length === 0) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2],
    created_at: row[3]
  }));
});

ipcMain.handle('add-tag', (event, { name, color }) => {
  try {
    db.run('INSERT INTO tags (name, color) VALUES (?, ?)', [name, color]);
    saveDatabase();
    const result = db.exec('SELECT last_insert_rowid()');
    return { success: true, id: result[0].values[0][0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-tag', (event, { id, name, color }) => {
  try {
    db.run('UPDATE tags SET name = ?, color = ? WHERE id = ?', [name, color, id]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-tag', (event, id) => {
  try {
    db.run('DELETE FROM conversation_tags WHERE tag_id = ?', [id]);
    db.run('DELETE FROM tags WHERE id = ?', [id]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== 대화-카테고리/태그 연결 IPC =====

ipcMain.handle('get-conversation-categories', (event, conversationId) => {
  const result = db.exec(`
    SELECT c.* FROM categories c
    JOIN conversation_categories cc ON c.id = cc.category_id
    WHERE cc.conversation_id = ?
  `, [conversationId]);
  
  if (result.length === 0) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2],
    created_at: row[3]
  }));
});

ipcMain.handle('get-conversation-tags', (event, conversationId) => {
  const result = db.exec(`
    SELECT t.* FROM tags t
    JOIN conversation_tags ct ON t.id = ct.tag_id
    WHERE ct.conversation_id = ?
  `, [conversationId]);
  
  if (result.length === 0) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2],
    created_at: row[3]
  }));
});

ipcMain.handle('set-conversation-category', (event, { conversationId, categoryId }) => {
  try {
    // 기존 카테고리 제거 후 새로 추가 (단일 카테고리)
    db.run('DELETE FROM conversation_categories WHERE conversation_id = ?', [conversationId]);
    if (categoryId) {
      db.run('INSERT INTO conversation_categories (conversation_id, category_id) VALUES (?, ?)', 
        [conversationId, categoryId]);
    }
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-conversation-tag', (event, { conversationId, tagId }) => {
  try {
    db.run('INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id) VALUES (?, ?)', 
      [conversationId, tagId]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-conversation-tag', (event, { conversationId, tagId }) => {
  try {
    db.run('DELETE FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?', 
      [conversationId, tagId]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 모든 대화의 카테고리/태그 정보 가져오기
ipcMain.handle('get-all-conversation-metadata', () => {
  const categories = {};
  const tags = {};
  
  const catResult = db.exec(`
    SELECT conversation_id, category_id FROM conversation_categories
  `);
  
  if (catResult.length > 0) {
    catResult[0].values.forEach(row => {
      categories[row[0]] = row[1];
    });
  }
  
  const tagResult = db.exec(`
    SELECT conversation_id, tag_id FROM conversation_tags
  `);
  
  if (tagResult.length > 0) {
    tagResult[0].values.forEach(row => {
      if (!tags[row[0]]) tags[row[0]] = [];
      tags[row[0]].push(row[1]);
    });
  }
  
  return { categories, tags };
});

// ===== Ollama API 관련 IPC =====

// Ollama 모델 목록 가져오기
ipcMain.handle('ollama-get-models', async (event, baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, models: data.models || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Ollama 연결 테스트
ipcMain.handle('ollama-test-connection', async (event, baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Ollama로 대화 분류
ipcMain.handle('ollama-classify', async (event, { baseUrl, model, conversationSummary, existingCategories, existingTags }) => {
  try {
    // 기타 카테고리가 없으면 목록에 추가
    const categoryList = existingCategories.length > 0 
      ? (existingCategories.includes('기타') ? existingCategories : [...existingCategories, '기타'])
      : ['기타'];
    
    const systemPrompt = `당신은 대화 분류 전문가입니다. 주어진 대화를 분석하고 카테고리와 태그를 JSON으로 출력하세요.

중요 규칙:
- 카테고리는 반드시 아래 목록에서만 선택하세요. 새로 만들지 마세요.
- 적합한 카테고리가 없으면 반드시 "기타"를 선택하세요.
- 태그는 기존 태그에서 선택하거나 새로 제안할 수 있습니다.
- 반드시 JSON만 출력: {"category":"카테고리","tags":["태그1","태그2"]}`;

    const userPrompt = `대화 제목 및 내용:
${conversationSummary.substring(0, 600)}

[카테고리 목록 - 이 중에서만 선택]
${categoryList.join(', ')}

[기존 태그 - 참고용]
${existingTags.slice(0, 12).join(', ') || '없음'}

위 카테고리 목록에서 하나를 선택하고, 태그 1~3개를 지정하여 JSON으로 출력하세요:`;

    console.log('Ollama 요청 시작:', model);
    
    // /api/chat 엔드포인트 사용 (더 안정적)
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 150
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama HTTP 에러:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 100)}` };
    }
    
    const data = await response.json();
    
    console.log('Ollama 응답:', JSON.stringify(data, null, 2));
    
    if (!data) {
      return { success: false, error: '응답 없음' };
    }
    
    // 응답 텍스트 추출 (여러 필드 확인)
    let responseText = '';
    
    // /api/chat 응답 형식: data.message.content
    if (data.message && data.message.content) {
      responseText = data.message.content.trim();
    }
    // /api/generate 응답 형식: data.response
    else if (data.response) {
      responseText = data.response.trim();
    }
    // thinking 모델: data.thinking 또는 data.message.thinking
    if (!responseText && data.thinking) {
      // thinking에서 JSON 추출 시도
      const thinkingJson = data.thinking.match(/\{[^{}]*"category"[^{}]*\}/);
      if (thinkingJson) {
        responseText = thinkingJson[0];
      }
    }
    if (!responseText && data.message && data.message.thinking) {
      const thinkingJson = data.message.thinking.match(/\{[^{}]*"category"[^{}]*\}/);
      if (thinkingJson) {
        responseText = thinkingJson[0];
      }
    }
    
    console.log('AI 원본 응답:', responseText);
    
    // done_reason이 length면 토큰 제한 도달
    if ((data.done_reason === 'length' || (data.message && !data.message.content)) && !responseText) {
      return { success: false, error: '토큰 제한 도달 - 더 작은 모델 사용을 권장합니다' };
    }
    
    if (!responseText) {
      return { success: false, error: `빈 응답` };
    }
    
    // JSON 파싱 시도 - 여러 방법으로 시도
    let result = null;
    
    // 방법 1: 전체가 JSON인 경우
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      // 방법 2: JSON 블록 추출 시도 (```json ... ``` 형식)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          result = JSON.parse(codeBlockMatch[1].trim());
        } catch (e2) {}
      }
      
      // 방법 3: { } 블록 추출 (category 포함)
      if (!result) {
        const jsonMatch = responseText.match(/\{[^{}]*"category"[^{}]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch (e3) {}
        }
      }
      
      // 방법 4: 더 넓은 범위로 { } 찾기
      if (!result) {
        const braceStart = responseText.indexOf('{');
        const braceEnd = responseText.lastIndexOf('}');
        if (braceStart !== -1 && braceEnd > braceStart) {
          try {
            result = JSON.parse(responseText.substring(braceStart, braceEnd + 1));
          } catch (e4) {}
        }
      }
      
      // 방법 5: 텍스트에서 카테고리와 태그 직접 추출 시도
      if (!result) {
        const categoryMatch = responseText.match(/[""']?category[""']?\s*[:=]\s*[""']([^""']+)[""']/i);
        const tagsMatch = responseText.match(/[""']?tags[""']?\s*[:=]\s*\[([^\]]+)\]/i);
        
        if (categoryMatch) {
          result = {
            category: categoryMatch[1].trim(),
            tags: []
          };
          
          if (tagsMatch) {
            const tagStr = tagsMatch[1];
            const tagMatches = tagStr.match(/[""']([^""']+)[""']/g);
            if (tagMatches) {
              result.tags = tagMatches.map(t => t.replace(/[""']/g, '').trim());
            }
          }
        }
      }
    }
    
    if (result && result.category) {
      // 카테고리가 기존 목록에 없으면 "기타"로 변경
      if (!categoryList.includes(result.category)) {
        console.log(`카테고리 "${result.category}"가 목록에 없어 "기타"로 변경`);
        result.category = '기타';
      }
      
      console.log('파싱 성공:', result);
      return { 
        success: true, 
        category: result.category,
        tags: Array.isArray(result.tags) ? result.tags.slice(0, 3) : []
      };
    } else {
      console.error('파싱 실패, 원본:', responseText);
      const preview = responseText.length > 80 ? responseText.substring(0, 80) + '...' : responseText;
      return { success: false, error: `파싱 실패: ${preview}` };
    }
  } catch (error) {
    console.error('Ollama 분류 에러:', error);
    return { success: false, error: error.message || '알 수 없는 오류' };
  }
});

// ===== 설정 관련 IPC =====

// 설정 값 가져오기
ipcMain.handle('get-setting', (event, key) => {
  try {
    const result = db.exec(`SELECT value FROM settings WHERE key = ?`, [key]);
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0];
    }
    return null;
  } catch (error) {
    console.error('설정 불러오기 에러:', error);
    return null;
  }
});

// 설정 값 저장하기
ipcMain.handle('set-setting', (event, { key, value }) => {
  try {
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('설정 저장 에러:', error);
    return { success: false, error: error.message };
  }
});

// 마지막 열었던 파일 정보 저장
ipcMain.handle('save-last-opened', (event, { type, path }) => {
  try {
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('lastOpenedType', ?)`, [type]);
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('lastOpenedPath', ?)`, [path]);
    saveDatabase();
    return { success: true };
  } catch (error) {
    console.error('마지막 파일 저장 에러:', error);
    return { success: false, error: error.message };
  }
});

// 마지막 열었던 파일 정보 가져오기
ipcMain.handle('get-last-opened', () => {
  try {
    const typeResult = db.exec(`SELECT value FROM settings WHERE key = 'lastOpenedType'`);
    const pathResult = db.exec(`SELECT value FROM settings WHERE key = 'lastOpenedPath'`);
    
    if (typeResult.length > 0 && pathResult.length > 0 &&
        typeResult[0].values.length > 0 && pathResult[0].values.length > 0) {
      const type = typeResult[0].values[0][0];
      const filePath = pathResult[0].values[0][0];
      
      // 파일/폴더가 존재하는지 확인
      if (fs.existsSync(filePath)) {
        return { type, path: filePath };
      }
    }
    return null;
  } catch (error) {
    console.error('마지막 파일 불러오기 에러:', error);
    return null;
  }
});
