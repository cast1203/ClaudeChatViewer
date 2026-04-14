// ===== 전역 상태 =====
let conversations = [];
let filteredConversations = [];
let currentChatId = null;
let searchQuery = '';
let categories = [];
let tags = [];
let conversationMetadata = { categories: {}, tags: {} };
let selectedCategoryFilter = '';
let selectedTagFilter = '';
let messageFilter = 'all'; // 'all', 'human', 'assistant'
let aiProcessCancelled = false;
let contextMenuTargetId = null; // 컨텍스트 메뉴 대상 대화 ID

// ===== DOM 요소 =====
const elements = {
  loadBtn: document.getElementById('load-btn'),
  loadZipBtn: document.getElementById('load-zip-btn'),
  loadFolderBtn: document.getElementById('load-folder-btn'),
  manageBtn: document.getElementById('manage-btn'),
  aiBtn: document.getElementById('ai-btn'),
  searchInput: document.getElementById('search-input'),
  clearSearch: document.getElementById('clear-search'),
  sortSelect: document.getElementById('sort-select'),
  categoryFilter: document.getElementById('category-filter'),
  tagFilter: document.getElementById('tag-filter'),
  chatCount: document.getElementById('chat-count'),
  chatList: document.getElementById('chat-list'),
  welcomeScreen: document.getElementById('welcome-screen'),
  chatView: document.getElementById('chat-view'),
  chatTitle: document.getElementById('chat-title'),
  chatDate: document.getElementById('chat-date'),
  chatMessageCount: document.getElementById('chat-message-count'),
  chatMetadata: document.getElementById('chat-metadata'),
  currentCategory: document.getElementById('current-category'),
  currentTags: document.getElementById('current-tags'),
  editMetadataBtn: document.getElementById('edit-metadata-btn'),
  messagesContainer: document.getElementById('messages-container'),
  loadingOverlay: document.getElementById('loading-overlay'),
  toast: document.getElementById('toast'),
  // 관리 모달
  manageModal: document.getElementById('manage-modal'),
  closeManageModal: document.getElementById('close-manage-modal'),
  categoriesTab: document.getElementById('categories-tab'),
  tagsTab: document.getElementById('tags-tab'),
  categoriesList: document.getElementById('categories-list'),
  tagsList: document.getElementById('tags-list'),
  newCategoryName: document.getElementById('new-category-name'),
  newCategoryColor: document.getElementById('new-category-color'),
  addCategoryBtn: document.getElementById('add-category-btn'),
  newTagName: document.getElementById('new-tag-name'),
  newTagColor: document.getElementById('new-tag-color'),
  addTagBtn: document.getElementById('add-tag-btn'),
  // 메타데이터 모달
  metadataModal: document.getElementById('metadata-modal'),
  closeMetadataModal: document.getElementById('close-metadata-modal'),
  selectCategory: document.getElementById('select-category'),
  tagCheckboxes: document.getElementById('tag-checkboxes'),
  saveMetadataBtn: document.getElementById('save-metadata-btn'),
  // AI 모달
  aiModal: document.getElementById('ai-modal'),
  closeAiModal: document.getElementById('close-ai-modal'),
  ollamaUrl: document.getElementById('ollama-url'),
  ollamaModel: document.getElementById('ollama-model'),
  refreshModelsBtn: document.getElementById('refresh-models-btn'),
  testConnectionBtn: document.getElementById('test-connection-btn'),
  connectionStatus: document.getElementById('connection-status'),
  skipClassified: document.getElementById('skip-classified'),
  autoCreateTags: document.getElementById('auto-create-tags'),
  aiProgress: document.getElementById('ai-progress'),
  progressText: document.getElementById('progress-text'),
  progressFill: document.getElementById('progress-fill'),
  progressDetail: document.getElementById('progress-detail'),
  cancelProcessBtn: document.getElementById('cancel-process-btn'),
  startAiBtn: document.getElementById('start-ai-btn'),
  // 컨텍스트 메뉴
  contextMenu: document.getElementById('context-menu'),
  categorySubmenu: document.getElementById('category-submenu'),
  // 타이틀바
  titlebarMinimize: document.getElementById('titlebar-minimize'),
  titlebarMaximize: document.getElementById('titlebar-maximize'),
  titlebarClose: document.getElementById('titlebar-close'),
  maximizeIcon: document.getElementById('maximize-icon'),
  restoreIcon: document.getElementById('restore-icon')
};

// ===== 초기화 =====
async function init() {
  // 카테고리/태그 로드
  await loadCategoriesAndTags();
  
  // 이벤트 리스너 등록
  elements.loadBtn.addEventListener('click', handleLoadFile);
  elements.loadZipBtn.addEventListener('click', handleLoadZip);
  elements.loadFolderBtn.addEventListener('click', handleLoadFolder);
  elements.manageBtn.addEventListener('click', openManageModal);
  elements.aiBtn.addEventListener('click', openAiModal);
  elements.searchInput.addEventListener('input', handleSearch);
  elements.clearSearch.addEventListener('click', clearSearch);
  elements.sortSelect.addEventListener('change', handleSort);
  elements.categoryFilter.addEventListener('change', handleFilter);
  elements.tagFilter.addEventListener('change', handleFilter);
  elements.editMetadataBtn.addEventListener('click', openMetadataModal);
  
  // 관리 모달 이벤트
  elements.closeManageModal.addEventListener('click', closeManageModal);
  elements.addCategoryBtn.addEventListener('click', addCategory);
  elements.addTagBtn.addEventListener('click', addTag);
  
  // 탭 전환
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // 메타데이터 모달 이벤트
  elements.closeMetadataModal.addEventListener('click', closeMetadataModal);
  elements.saveMetadataBtn.addEventListener('click', saveMetadata);
  
  // 메시지 필터 버튼 이벤트
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      messageFilter = btn.dataset.filter;
      
      // 현재 대화 다시 렌더링
      if (currentChatId) {
        const conv = conversations.find(c => c.id === currentChatId);
        if (conv) renderMessages(conv.messages);
      }
    });
  });
  
  // 모달 외부 클릭시 닫기
  elements.manageModal.addEventListener('click', (e) => {
    if (e.target === elements.manageModal) closeManageModal();
  });
  elements.metadataModal.addEventListener('click', (e) => {
    if (e.target === elements.metadataModal) closeMetadataModal();
  });
  elements.aiModal.addEventListener('click', (e) => {
    if (e.target === elements.aiModal) closeAiModal();
  });
  
  // AI 모달 이벤트
  elements.closeAiModal.addEventListener('click', closeAiModal);
  elements.refreshModelsBtn.addEventListener('click', refreshOllamaModels);
  elements.testConnectionBtn.addEventListener('click', testOllamaConnection);
  elements.startAiBtn.addEventListener('click', startAiClassification);
  elements.cancelProcessBtn.addEventListener('click', () => { aiProcessCancelled = true; });
  
  // 컨텍스트 메뉴 이벤트
  document.addEventListener('click', hideContextMenu);
  document.addEventListener('contextmenu', (e) => {
    // 채팅 목록 외부 클릭시 메뉴 숨김
    if (!e.target.closest('.chat-item')) {
      hideContextMenu();
    }
  });
  
  // 컨텍스트 메뉴 항목 클릭 이벤트
  elements.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (action === 'rename') {
        handleRenameConversation();
      } else if (action === 'delete') {
        handleDeleteConversation();
      }
      // category는 서브메뉴로 처리
    });
  });
  
  // 타이틀바 버튼 이벤트
  elements.titlebarMinimize.addEventListener('click', () => {
    window.electronAPI.windowMinimize();
  });
  
  elements.titlebarMaximize.addEventListener('click', async () => {
    const isMaximized = await window.electronAPI.windowMaximize();
    updateMaximizeIcon(isMaximized);
  });
  
  elements.titlebarClose.addEventListener('click', () => {
    window.electronAPI.windowClose();
  });
  
  // 초기 최대화 상태 확인
  updateMaximizeState();
  
  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault();
      handleLoadFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      elements.searchInput.focus();
    }
    if (e.key === 'Escape') {
      closeManageModal();
      closeMetadataModal();
      clearSearch();
      elements.searchInput.blur();
    }
  });
  
  // 마지막 열었던 파일 자동 로드
  await loadLastOpenedFile();
}

// 마지막 열었던 파일 자동 로드
async function loadLastOpenedFile() {
  try {
    const lastOpened = await window.electronAPI.getLastOpened();
    if (lastOpened) {
      showLoading();
      console.log('마지막 파일 로드:', lastOpened);
      
      let result;
      if (lastOpened.type === 'zip') {
        result = await window.electronAPI.loadZip(lastOpened.path);
      } else if (lastOpened.type === 'folder') {
        result = await window.electronAPI.loadFolder(lastOpened.path);
      } else if (lastOpened.type === 'json') {
        result = await window.electronAPI.loadJson(lastOpened.path);
      }
      
      if (result && result.success && result.conversations.length > 0) {
        processConversations(result.conversations);
        showToast(`${conversations.length}개 대화 로드됨 (자동)`, 'success');
      }
      
      hideLoading();
    }
  } catch (error) {
    console.error('마지막 파일 로드 실패:', error);
    hideLoading();
  }
}

// ===== 카테고리/태그 로드 =====
async function loadCategoriesAndTags() {
  categories = await window.electronAPI.getCategories();
  tags = await window.electronAPI.getTags();
  conversationMetadata = await window.electronAPI.getAllConversationMetadata();
  
  updateFilterDropdowns();
}

function updateFilterDropdowns() {
  // 카테고리 필터 업데이트
  elements.categoryFilter.innerHTML = '<option value="">모든 카테고리</option>' +
    categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  // 태그 필터 업데이트
  elements.tagFilter.innerHTML = '<option value="">모든 태그</option>' +
    tags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// ===== 파일 로드 핸들러 =====
async function handleLoadFile() {
  const path = await window.electronAPI.selectFile();
  if (!path) return;
  
  showLoading();
  
  try {
    let result;
    let fileType;
    if (path.endsWith('.zip')) {
      result = await window.electronAPI.loadZip(path);
      fileType = 'zip';
    } else if (path.endsWith('.json')) {
      result = await window.electronAPI.loadJson(path);
      fileType = 'json';
    }
    
    if (result.success) {
      processConversations(result.conversations);
      showToast(`${conversations.length}개 대화를 불러왔습니다`, 'success');
      // 마지막 열었던 파일 저장
      await window.electronAPI.saveLastOpened({ type: fileType, path: path });
    } else {
      showToast(`오류: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`오류: ${error.message}`, 'error');
  }
  
  hideLoading();
}

async function handleLoadZip() {
  const path = await window.electronAPI.selectFile();
  if (!path) return;
  
  showLoading();
  
  try {
    const result = await window.electronAPI.loadZip(path);
    if (result.success) {
      processConversations(result.conversations);
      showToast(`${conversations.length}개 대화를 불러왔습니다`, 'success');
      // 마지막 열었던 파일 저장
      await window.electronAPI.saveLastOpened({ type: 'zip', path: path });
    } else {
      showToast(`오류: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`오류: ${error.message}`, 'error');
  }
  
  hideLoading();
}

async function handleLoadFolder() {
  const path = await window.electronAPI.selectFolder();
  if (!path) return;
  
  showLoading();
  
  try {
    const result = await window.electronAPI.loadFolder(path);
    if (result.success) {
      processConversations(result.conversations);
      showToast(`${conversations.length}개 대화를 불러왔습니다`, 'success');
      // 마지막 열었던 파일 저장
      await window.electronAPI.saveLastOpened({ type: 'folder', path: path });
    } else {
      showToast(`오류: ${result.error}`, 'error');
    }
  } catch (error) {
    showToast(`오류: ${error.message}`, 'error');
  }
  
  hideLoading();
}

// ===== 대화 데이터 처리 =====
function processConversations(rawData) {
  conversations = rawData.map(normalizeConversation).filter(c => c !== null);
  
  const seen = new Set();
  conversations = conversations.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  
  sortConversations('newest');
  applyFilters();
}

function normalizeConversation(raw) {
  try {
    const id = raw.uuid || raw.id || raw.conversation_id || generateId();
    const name = raw.name || raw.title || raw.conversation_name || '제목 없음';
    const createdAt = parseDate(raw.created_at || raw.create_time || raw.timestamp);
    const updatedAt = parseDate(raw.updated_at || raw.update_time || raw.created_at);
    
    let messages = [];
    
    if (raw.chat_messages && Array.isArray(raw.chat_messages)) {
      messages = raw.chat_messages.map(normalizeMessage);
    } else if (raw.messages && Array.isArray(raw.messages)) {
      messages = raw.messages.map(normalizeMessage);
    } else if (raw.mapping) {
      messages = extractMessagesFromMapping(raw.mapping);
    }
    
    if (messages.length === 0) return null;
    
    return {
      id,
      name,
      createdAt,
      updatedAt,
      messages,
      preview: getPreview(messages)
    };
  } catch (e) {
    console.error('Failed to normalize conversation:', e);
    return null;
  }
}

function normalizeMessage(raw) {
  let role = raw.sender || raw.role || raw.author || 'unknown';
  
  if (role === 'user' || role === 'human') {
    role = 'human';
  } else if (role === 'assistant' || role === 'claude' || role === 'ai') {
    role = 'assistant';
  }
  
  let content = '';
  if (typeof raw.text === 'string') {
    content = raw.text;
  } else if (typeof raw.content === 'string') {
    content = raw.content;
  } else if (Array.isArray(raw.content)) {
    content = raw.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  } else if (raw.parts && Array.isArray(raw.parts)) {
    content = raw.parts.join('\n');
  }
  
  return {
    role,
    content,
    timestamp: parseDate(raw.created_at || raw.timestamp)
  };
}

function extractMessagesFromMapping(mapping) {
  const messages = [];
  for (const node of Object.values(mapping)) {
    if (node.message && node.message.content) {
      messages.push(normalizeMessage(node.message));
    }
  }
  return messages;
}

function getPreview(messages) {
  const firstHuman = messages.find(m => m.role === 'human');
  if (firstHuman) {
    return firstHuman.content.slice(0, 100).replace(/\n/g, ' ');
  }
  return '';
}

// ===== 유틸리티 함수 =====
function generateId() {
  return 'conv_' + Math.random().toString(36).substr(2, 9);
}

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return '오늘 ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '어제';
  } else if (days < 7) {
    return `${days}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

function formatFullDate(date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ===== 검색 & 필터 =====
function handleSearch(e) {
  searchQuery = e.target.value.toLowerCase().trim();
  elements.clearSearch.style.display = searchQuery ? 'flex' : 'none';
  applyFilters();
}

function clearSearch() {
  elements.searchInput.value = '';
  searchQuery = '';
  elements.clearSearch.style.display = 'none';
  applyFilters();
}

function handleFilter() {
  selectedCategoryFilter = elements.categoryFilter.value;
  selectedTagFilter = elements.tagFilter.value;
  applyFilters();
}

function applyFilters() {
  filteredConversations = conversations.filter(conv => {
    // 검색어 필터
    if (searchQuery) {
      const matchesTitle = conv.name.toLowerCase().includes(searchQuery);
      const matchesContent = conv.messages.some(msg => 
        msg.content.toLowerCase().includes(searchQuery)
      );
      if (!matchesTitle && !matchesContent) return false;
    }
    
    // 카테고리 필터
    if (selectedCategoryFilter) {
      const convCategory = conversationMetadata.categories[conv.id];
      if (convCategory != selectedCategoryFilter) return false;
    }
    
    // 태그 필터
    if (selectedTagFilter) {
      const convTags = conversationMetadata.tags[conv.id] || [];
      if (!convTags.includes(parseInt(selectedTagFilter))) return false;
    }
    
    return true;
  });
  
  renderChatList();
  updateChatCount();
}

function handleSort() {
  const sortType = elements.sortSelect.value;
  sortConversations(sortType);
  applyFilters();
}

function sortConversations(sortType) {
  conversations.sort(getSortFunction(sortType));
}

function getSortFunction(sortType) {
  switch (sortType) {
    case 'newest':
      return (a, b) => b.updatedAt - a.updatedAt;
    case 'oldest':
      return (a, b) => a.updatedAt - b.updatedAt;
    case 'name':
      return (a, b) => a.name.localeCompare(b.name, 'ko');
    default:
      return (a, b) => b.updatedAt - a.updatedAt;
  }
}

// ===== 렌더링 =====
function renderChatList() {
  if (filteredConversations.length === 0) {
    if (conversations.length === 0) {
      elements.chatList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>불러온 대화가 없습니다</p>
        </div>
      `;
    } else {
      elements.chatList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <p>검색 결과가 없습니다</p>
        </div>
      `;
    }
    return;
  }
  
  elements.chatList.innerHTML = filteredConversations.map(conv => {
    const categoryId = conversationMetadata.categories[conv.id];
    const category = categories.find(c => c.id === categoryId);
    const tagIds = conversationMetadata.tags[conv.id] || [];
    const convTags = tags.filter(t => tagIds.includes(t.id));
    
    let badgesHtml = '';
    if (category || convTags.length > 0) {
      badgesHtml = '<div class="chat-item-badges">';
      if (category) {
        badgesHtml += `<span class="badge category-badge" style="background: ${category.color}20; color: ${category.color}">${escapeHtml(category.name)}</span>`;
      }
      convTags.forEach(tag => {
        badgesHtml += `<span class="badge tag-badge" style="background: ${tag.color}20; color: ${tag.color}">${escapeHtml(tag.name)}</span>`;
      });
      badgesHtml += '</div>';
    }
    
    return `
      <div class="chat-item ${conv.id === currentChatId ? 'active' : ''}" data-id="${conv.id}">
        <div class="chat-item-title">${escapeHtml(conv.name)}</div>
        <div class="chat-item-preview">${escapeHtml(conv.preview)}</div>
        <div class="chat-item-meta">
          <span>${formatDate(conv.updatedAt)}</span>
          <span>•</span>
          <span>${conv.messages.length}개 메시지</span>
        </div>
        ${badgesHtml}
      </div>
    `;
  }).join('');
  
  elements.chatList.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      selectChat(id);
    });
    
    // 오른쪽 클릭 컨텍스트 메뉴
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, item.dataset.id);
    });
  });
}

function selectChat(id) {
  currentChatId = id;
  const conv = conversations.find(c => c.id === id);
  
  if (!conv) return;
  
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
  
  elements.welcomeScreen.style.display = 'none';
  elements.chatView.style.display = 'flex';
  
  elements.chatTitle.textContent = conv.name;
  elements.chatDate.textContent = formatFullDate(conv.createdAt);
  elements.chatMessageCount.textContent = `${conv.messages.length}개 메시지`;
  
  renderChatMetadata(id);
  renderMessages(conv.messages);
}

function renderChatMetadata(convId) {
  const categoryId = conversationMetadata.categories[convId];
  const category = categories.find(c => c.id === categoryId);
  const tagIds = conversationMetadata.tags[convId] || [];
  const convTags = tags.filter(t => tagIds.includes(t.id));
  
  if (category) {
    elements.currentCategory.innerHTML = `
      <span class="metadata-badge" style="background: ${category.color}20; color: ${category.color}">
        📁 ${escapeHtml(category.name)}
      </span>
    `;
  } else {
    elements.currentCategory.innerHTML = '';
  }
  
  if (convTags.length > 0) {
    elements.currentTags.innerHTML = convTags.map(tag => `
      <span class="metadata-badge" style="background: ${tag.color}20; color: ${tag.color}">
        🏷️ ${escapeHtml(tag.name)}
      </span>
    `).join('');
  } else {
    elements.currentTags.innerHTML = '';
  }
}

function renderMessages(messages) {
  // 메시지 필터 적용
  let filteredMessages = messages;
  if (messageFilter !== 'all') {
    filteredMessages = messages.filter(msg => msg.role === messageFilter);
  }
  
  if (filteredMessages.length === 0) {
    elements.messagesContainer.innerHTML = `
      <div class="empty-messages">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>${messageFilter === 'human' ? '내 메시지가 없습니다' : 'Claude 메시지가 없습니다'}</p>
      </div>
    `;
    return;
  }
  
  elements.messagesContainer.innerHTML = filteredMessages.map(msg => `
    <div class="message ${msg.role}">
      <div class="message-avatar">${msg.role === 'human' ? 'H' : 'C'}</div>
      <div class="message-bubble">
        <div class="message-role">${msg.role === 'human' ? 'You' : 'Claude'}</div>
        <div class="message-content">
          ${formatMessageContent(msg.content)}
        </div>
      </div>
    </div>
  `).join('');
  
  elements.messagesContainer.scrollTop = 0;
}

function formatMessageContent(content) {
  if (!content) return '';
  
  let html = escapeHtml(content);
  
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });
  
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  if (searchQuery) {
    const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi');
    html = html.replace(regex, '<span class="highlight">$1</span>');
  }
  
  return `<p>${html}</p>`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateChatCount() {
  const count = filteredConversations.length;
  const total = conversations.length;
  
  if ((searchQuery || selectedCategoryFilter || selectedTagFilter) && count !== total) {
    elements.chatCount.textContent = `${count}/${total}개 대화`;
  } else {
    elements.chatCount.textContent = `${count}개 대화`;
  }
}

// ===== 관리 모달 =====
function openManageModal() {
  elements.manageModal.style.display = 'flex';
  renderCategoriesList();
  renderTagsList();
}

function closeManageModal() {
  elements.manageModal.style.display = 'none';
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  elements.categoriesTab.classList.toggle('active', tab === 'categories');
  elements.tagsTab.classList.toggle('active', tab === 'tags');
}

function renderCategoriesList() {
  if (categories.length === 0) {
    elements.categoriesList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">카테고리가 없습니다</p>';
    return;
  }
  
  elements.categoriesList.innerHTML = categories.map(cat => `
    <div class="item-row" data-id="${cat.id}">
      <div class="item-color" style="background: ${cat.color}"></div>
      <span class="item-name">${escapeHtml(cat.name)}</span>
      <div class="item-actions">
        <button class="item-action-btn edit" title="수정" onclick="editCategory(${cat.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="item-action-btn delete" title="삭제" onclick="deleteCategory(${cat.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

function renderTagsList() {
  if (tags.length === 0) {
    elements.tagsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">태그가 없습니다</p>';
    return;
  }
  
  elements.tagsList.innerHTML = tags.map(tag => `
    <div class="item-row" data-id="${tag.id}">
      <div class="item-color" style="background: ${tag.color}"></div>
      <span class="item-name">${escapeHtml(tag.name)}</span>
      <div class="item-actions">
        <button class="item-action-btn edit" title="수정" onclick="editTag(${tag.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="item-action-btn delete" title="삭제" onclick="deleteTag(${tag.id})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

async function addCategory() {
  const name = elements.newCategoryName.value.trim();
  const color = elements.newCategoryColor.value;
  
  if (!name) {
    showToast('카테고리 이름을 입력하세요', 'error');
    return;
  }
  
  const result = await window.electronAPI.addCategory({ name, color });
  
  if (result.success) {
    elements.newCategoryName.value = '';
    await loadCategoriesAndTags();
    renderCategoriesList();
    showToast('카테고리가 추가되었습니다', 'success');
  } else {
    showToast(`오류: ${result.error}`, 'error');
  }
}

async function editCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;
  
  const name = prompt('카테고리 이름:', cat.name);
  if (name === null) return;
  
  const color = prompt('색상 (예: #6366f1):', cat.color) || cat.color;
  
  const result = await window.electronAPI.updateCategory({ id, name, color });
  
  if (result.success) {
    await loadCategoriesAndTags();
    renderCategoriesList();
    renderChatList();
    if (currentChatId) renderChatMetadata(currentChatId);
    showToast('카테고리가 수정되었습니다', 'success');
  } else {
    showToast(`오류: ${result.error}`, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;
  
  const result = await window.electronAPI.deleteCategory(id);
  
  if (result.success) {
    await loadCategoriesAndTags();
    renderCategoriesList();
    renderChatList();
    if (currentChatId) renderChatMetadata(currentChatId);
    showToast('카테고리가 삭제되었습니다', 'success');
  } else {
    showToast(`오류: ${result.error}`, 'error');
  }
}

async function addTag() {
  const name = elements.newTagName.value.trim();
  const color = elements.newTagColor.value;
  
  if (!name) {
    showToast('태그 이름을 입력하세요', 'error');
    return;
  }
  
  const result = await window.electronAPI.addTag({ name, color });
  
  if (result.success) {
    elements.newTagName.value = '';
    await loadCategoriesAndTags();
    renderTagsList();
    showToast('태그가 추가되었습니다', 'success');
  } else {
    showToast(`오류: ${result.error}`, 'error');
  }
}

async function editTag(id) {
  const tag = tags.find(t => t.id === id);
  if (!tag) return;
  
  const name = prompt('태그 이름:', tag.name);
  if (name === null) return;
  
  const color = prompt('색상 (예: #22c55e):', tag.color) || tag.color;
  
  const result = await window.electronAPI.updateTag({ id, name, color });
  
  if (result.success) {
    await loadCategoriesAndTags();
    renderTagsList();
    renderChatList();
    if (currentChatId) renderChatMetadata(currentChatId);
    showToast('태그가 수정되었습니다', 'success');
  } else {
    showToast(`오류: ${result.error}`, 'error');
  }
}

async function deleteTag(id) {
  if (!confirm('이 태그를 삭제하시겠습니까?')) return;
  
  const result = await window.electronAPI.deleteTag(id);
  
  if (result.success) {
    await loadCategoriesAndTags();
    renderTagsList();
    renderChatList();
    if (currentChatId) renderChatMetadata(currentChatId);
    showToast('태그가 삭제되었습니다', 'success');
  } else {
    showToast(`오류: ${result.error}`, 'error');
  }
}

// ===== 메타데이터 모달 =====
function openMetadataModal() {
  if (!currentChatId) return;
  
  // 카테고리 선택 업데이트
  elements.selectCategory.innerHTML = '<option value="">카테고리 없음</option>' +
    categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  const currentCategoryId = conversationMetadata.categories[currentChatId];
  if (currentCategoryId) {
    elements.selectCategory.value = currentCategoryId;
  }
  
  // 태그 체크박스 업데이트
  const currentTagIds = conversationMetadata.tags[currentChatId] || [];
  elements.tagCheckboxes.innerHTML = tags.map(tag => `
    <label class="tag-checkbox ${currentTagIds.includes(tag.id) ? 'selected' : ''}">
      <input type="checkbox" value="${tag.id}" ${currentTagIds.includes(tag.id) ? 'checked' : ''}>
      <span class="tag-checkbox-color" style="background: ${tag.color}"></span>
      <span class="tag-checkbox-name">${escapeHtml(tag.name)}</span>
    </label>
  `).join('');
  
  // 체크박스 클릭 이벤트
  elements.tagCheckboxes.querySelectorAll('.tag-checkbox').forEach(label => {
    label.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        const checkbox = label.querySelector('input');
        checkbox.checked = !checkbox.checked;
      }
      label.classList.toggle('selected', label.querySelector('input').checked);
    });
  });
  
  elements.metadataModal.style.display = 'flex';
}

function closeMetadataModal() {
  elements.metadataModal.style.display = 'none';
}

async function saveMetadata() {
  if (!currentChatId) return;
  
  const categoryId = elements.selectCategory.value || null;
  const selectedTagIds = Array.from(elements.tagCheckboxes.querySelectorAll('input:checked'))
    .map(input => parseInt(input.value));
  
  // 카테고리 저장
  await window.electronAPI.setConversationCategory({
    conversationId: currentChatId,
    categoryId: categoryId ? parseInt(categoryId) : null
  });
  
  // 기존 태그 제거 후 새 태그 추가
  const oldTagIds = conversationMetadata.tags[currentChatId] || [];
  
  for (const tagId of oldTagIds) {
    if (!selectedTagIds.includes(tagId)) {
      await window.electronAPI.removeConversationTag({
        conversationId: currentChatId,
        tagId
      });
    }
  }
  
  for (const tagId of selectedTagIds) {
    if (!oldTagIds.includes(tagId)) {
      await window.electronAPI.addConversationTag({
        conversationId: currentChatId,
        tagId
      });
    }
  }
  
  // 메타데이터 새로고침
  conversationMetadata = await window.electronAPI.getAllConversationMetadata();
  
  closeMetadataModal();
  renderChatMetadata(currentChatId);
  renderChatList();
  showToast('저장되었습니다', 'success');
}

// ===== AI 자동 분류 =====

function openAiModal() {
  elements.aiModal.style.display = 'flex';
  elements.aiProgress.style.display = 'none';
  elements.connectionStatus.style.display = 'none';
  refreshOllamaModels();
}

function closeAiModal() {
  elements.aiModal.style.display = 'none';
  aiProcessCancelled = true;
}

async function refreshOllamaModels() {
  const baseUrl = elements.ollamaUrl.value.trim();
  
  elements.ollamaModel.innerHTML = '<option value="">로딩 중...</option>';
  
  const result = await window.electronAPI.ollamaGetModels(baseUrl);
  
  if (result.success) {
    elements.ollamaModel.innerHTML = '<option value="">모델을 선택하세요</option>' +
      result.models.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
  } else {
    elements.ollamaModel.innerHTML = '<option value="">연결 실패</option>';
  }
}

async function testOllamaConnection() {
  const baseUrl = elements.ollamaUrl.value.trim();
  
  elements.connectionStatus.className = 'connection-status';
  elements.connectionStatus.textContent = '연결 테스트 중...';
  elements.connectionStatus.style.display = 'block';
  
  const result = await window.electronAPI.ollamaTestConnection(baseUrl);
  
  if (result.success) {
    elements.connectionStatus.className = 'connection-status success';
    elements.connectionStatus.textContent = '✓ Ollama 서버에 연결되었습니다';
    refreshOllamaModels();
  } else {
    elements.connectionStatus.className = 'connection-status error';
    elements.connectionStatus.textContent = `✗ 연결 실패: ${result.error}`;
  }
}

async function startAiClassification() {
  const baseUrl = elements.ollamaUrl.value.trim();
  const model = elements.ollamaModel.value;
  const processMode = document.querySelector('input[name="process-mode"]:checked').value;
  const skipClassified = elements.skipClassified.checked;
  const autoCreateTags = elements.autoCreateTags.checked;
  
  if (!model) {
    showToast('모델을 선택하세요', 'error');
    return;
  }
  
  if (conversations.length === 0) {
    showToast('대화를 먼저 불러오세요', 'error');
    return;
  }
  
  // 단건 처리시 선택된 대화 확인
  if (processMode === 'single' && !currentChatId) {
    showToast('대화를 먼저 선택하세요', 'error');
    return;
  }
  
  aiProcessCancelled = false;
  elements.aiProgress.style.display = 'block';
  elements.startAiBtn.disabled = true;
  
  try {
    let targetConversations;
    
    if (processMode === 'single') {
      targetConversations = [conversations.find(c => c.id === currentChatId)];
    } else {
      targetConversations = [...conversations];
      
      // 이미 분류된 대화 건너뛰기
      if (skipClassified) {
        targetConversations = targetConversations.filter(conv => {
          const hasCategory = conversationMetadata.categories[conv.id];
          const hasTags = conversationMetadata.tags[conv.id]?.length > 0;
          return !hasCategory && !hasTags;
        });
      }
    }
    
    if (targetConversations.length === 0) {
      showToast('분류할 대화가 없습니다', 'error');
      elements.aiProgress.style.display = 'none';
      elements.startAiBtn.disabled = false;
      return;
    }
    
    const total = targetConversations.length;
    let processed = 0;
    let success = 0;
    let failed = 0;
    
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = `처리 중... (0/${total})`;
    elements.progressDetail.textContent = '';
    
    if (processMode === 'batch') {
      // 일괄 처리: 병렬로 처리 (동시에 3개씩)
      const batchSize = 3;
      
      for (let i = 0; i < targetConversations.length; i += batchSize) {
        if (aiProcessCancelled) break;
        
        const batch = targetConversations.slice(i, i + batchSize);
        const promises = batch.map(conv => classifyConversation(baseUrl, model, conv, autoCreateTags));
        
        const results = await Promise.all(promises);
        
        results.forEach((result, idx) => {
          processed++;
          if (result.success) {
            success++;
            elements.progressDetail.textContent = `✓ "${batch[idx].name}" → ${result.category}, [${result.tags?.join(', ') || ''}]`;
          } else {
            failed++;
            const errMsg = result.error || '알 수 없는 오류';
            elements.progressDetail.textContent = `✗ "${batch[idx].name}" 실패: ${errMsg.substring(0, 60)}`;
            console.error(`분류 실패 [${batch[idx].name}]:`, result.error);
          }
        });
        
        elements.progressFill.style.width = `${(processed / total) * 100}%`;
        elements.progressText.textContent = `처리 중... (${processed}/${total})`;
      }
    } else {
      // 순차 처리 또는 단건 처리
      for (const conv of targetConversations) {
        if (aiProcessCancelled) break;
        
        elements.progressDetail.textContent = `처리 중: "${conv.name}"`;
        
        const result = await classifyConversation(baseUrl, model, conv, autoCreateTags);
        
        processed++;
        if (result.success) {
          success++;
          elements.progressDetail.textContent = `✓ "${conv.name}" → ${result.category}, [${result.tags?.join(', ') || ''}]`;
        } else {
          failed++;
          const errMsg = result.error || '알 수 없는 오류';
          elements.progressDetail.textContent = `✗ "${conv.name}" 실패: ${errMsg.substring(0, 60)}`;
          console.error(`분류 실패 [${conv.name}]:`, result.error);
        }
        
        elements.progressFill.style.width = `${(processed / total) * 100}%`;
        elements.progressText.textContent = `처리 중... (${processed}/${total})`;
        
        // 순차 처리시 약간의 딜레이
        if (processMode === 'sequential' && !aiProcessCancelled) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // 완료
    if (aiProcessCancelled) {
      elements.progressText.textContent = `취소됨 (${success}개 성공, ${failed}개 실패)`;
      showToast('처리가 취소되었습니다', 'error');
    } else {
      elements.progressText.textContent = `완료! (${success}개 성공, ${failed}개 실패)`;
      showToast(`${success}개 대화 분류 완료`, 'success');
    }
    
    // 메타데이터 새로고침
    conversationMetadata = await window.electronAPI.getAllConversationMetadata();
    await loadCategoriesAndTags();
    renderChatList();
    if (currentChatId) renderChatMetadata(currentChatId);
    
  } catch (error) {
    showToast(`오류: ${error.message}`, 'error');
  }
  
  elements.startAiBtn.disabled = false;
}

async function classifyConversation(baseUrl, model, conv, autoCreateTags) {
  try {
    // 대화 내용 요약 생성 (처음 3개 메시지, 더 짧게)
    const summary = conv.messages.slice(0, 3).map(msg => {
      const role = msg.role === 'human' ? '사용자' : 'AI';
      const content = msg.content.slice(0, 150);  // 150자로 제한
      return `${role}: ${content}`;
    }).join('\n');
    
    const existingCategories = categories.map(c => c.name);
    const existingTags = tags.map(t => t.name);
    
    const result = await window.electronAPI.ollamaClassify({
      baseUrl,
      model,
      conversationSummary: `제목: ${conv.name}\n${summary}`,
      existingCategories,
      existingTags
    });
    
    if (!result.success) {
      return { success: false, error: result.error || 'API 호출 실패' };
    }
    
    // 카테고리 처리 - 기존 카테고리에서만 선택, 없으면 "기타"
    let categoryId = null;
    if (result.category) {
      // 기존 카테고리에서 찾기
      let existingCat = categories.find(c => c.name === result.category);
      
      // 기존 카테고리에 없으면 "기타" 사용
      if (!existingCat) {
        existingCat = categories.find(c => c.name === '기타');
        
        // "기타" 카테고리도 없으면 생성
        if (!existingCat) {
          const color = '#6b7280'; // 회색
          const newCatResult = await window.electronAPI.addCategory({
            name: '기타',
            color: color
          });
          if (newCatResult.success) {
            existingCat = { id: newCatResult.id, name: '기타', color: color };
            categories.push(existingCat);
          }
        }
      }
      
      if (existingCat) {
        categoryId = existingCat.id;
      }
    }
    
    // 태그 처리 - 새 태그 자동 생성 옵션에 따라
    const tagIds = [];
    if (result.tags && result.tags.length > 0) {
      for (const tagName of result.tags) {
        const existingTag = tags.find(t => t.name === tagName);
        if (existingTag) {
          tagIds.push(existingTag.id);
        } else if (autoCreateTags) {
          // 새 태그 생성
          const color = getRandomColor();
          const newTagResult = await window.electronAPI.addTag({
            name: tagName,
            color: color
          });
          if (newTagResult.success) {
            tagIds.push(newTagResult.id);
            tags.push({ id: newTagResult.id, name: tagName, color: color });
          }
        }
      }
    }
    
    // 카테고리 저장
    if (categoryId) {
      await window.electronAPI.setConversationCategory({
        conversationId: conv.id,
        categoryId
      });
    }
    
    // 태그 저장
    for (const tagId of tagIds) {
      await window.electronAPI.addConversationTag({
        conversationId: conv.id,
        tagId
      });
    }
    
    // 실제 저장된 카테고리 이름 확인
    const savedCategory = categoryId 
      ? categories.find(c => c.id === categoryId)?.name 
      : result.category;
    
    return { 
      success: true, 
      category: savedCategory,
      tags: result.tags
    };
  } catch (error) {
    console.error('classifyConversation 에러:', error);
    return { success: false, error: error.message || '분류 처리 중 오류' };
  }
}

// ===== 컨텍스트 메뉴 =====

function showContextMenu(e, convId) {
  contextMenuTargetId = convId;
  
  const menu = elements.contextMenu;
  const submenu = elements.categorySubmenu;
  
  // 카테고리 서브메뉴 업데이트
  const currentCategoryId = conversationMetadata.categories[convId];
  submenu.innerHTML = `
    <div class="context-submenu-item ${!currentCategoryId ? 'active' : ''}" data-category-id="">
      <span class="color-dot" style="background: #6b7280;"></span>
      <span>없음</span>
    </div>
    ${categories.map(cat => `
      <div class="context-submenu-item ${currentCategoryId === cat.id ? 'active' : ''}" data-category-id="${cat.id}">
        <span class="color-dot" style="background: ${cat.color};"></span>
        <span>${escapeHtml(cat.name)}</span>
      </div>
    `).join('')}
  `;
  
  // 서브메뉴 클릭 이벤트
  submenu.querySelectorAll('.context-submenu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const categoryId = item.dataset.categoryId;
      await handleSetCategory(categoryId ? parseInt(categoryId) : null);
      hideContextMenu();
    });
  });
  
  // 메뉴 위치 계산
  const menuWidth = 180;
  const menuHeight = 150;
  let x = e.clientX;
  let y = e.clientY;
  
  // 화면 경계 처리
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 10;
  }
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - 10;
  }
  
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'block';
}

function hideContextMenu() {
  elements.contextMenu.style.display = 'none';
  contextMenuTargetId = null;
}

async function handleRenameConversation() {
  if (!contextMenuTargetId) return;
  
  const conv = conversations.find(c => c.id === contextMenuTargetId);
  if (!conv) return;
  
  const newName = prompt('새 제목을 입력하세요:', conv.name);
  if (newName && newName.trim() && newName !== conv.name) {
    conv.name = newName.trim();
    
    // UI 업데이트
    renderChatList();
    if (currentChatId === contextMenuTargetId) {
      elements.chatTitle.textContent = conv.name;
    }
    
    showToast('제목이 변경되었습니다', 'success');
  }
  
  hideContextMenu();
}

async function handleDeleteConversation() {
  if (!contextMenuTargetId) return;
  
  const conv = conversations.find(c => c.id === contextMenuTargetId);
  if (!conv) return;
  
  const confirmed = confirm(`"${conv.name}" 대화를 목록에서 삭제하시겠습니까?\n\n(원본 파일은 삭제되지 않습니다)`);
  
  if (confirmed) {
    // conversations 배열에서 제거
    const index = conversations.findIndex(c => c.id === contextMenuTargetId);
    if (index > -1) {
      conversations.splice(index, 1);
    }
    
    // 현재 보고 있던 대화가 삭제된 경우
    if (currentChatId === contextMenuTargetId) {
      currentChatId = null;
      elements.chatView.style.display = 'none';
      elements.welcomeScreen.style.display = 'flex';
    }
    
    // UI 업데이트
    applyFiltersAndSort();
    showToast('대화가 목록에서 삭제되었습니다', 'success');
  }
  
  hideContextMenu();
}

async function handleSetCategory(categoryId) {
  if (!contextMenuTargetId) return;
  
  try {
    if (categoryId) {
      await window.electronAPI.setConversationCategory({
        conversationId: contextMenuTargetId,
        categoryId: categoryId
      });
      conversationMetadata.categories[contextMenuTargetId] = categoryId;
    } else {
      // 카테고리 제거 - DB에서 삭제
      await window.electronAPI.setConversationCategory({
        conversationId: contextMenuTargetId,
        categoryId: null
      });
      delete conversationMetadata.categories[contextMenuTargetId];
    }
    
    // UI 업데이트
    renderChatList();
    if (currentChatId === contextMenuTargetId) {
      renderChatMetadata(contextMenuTargetId);
    }
    
    const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : '없음';
    showToast(`카테고리가 "${categoryName}"(으)로 변경되었습니다`, 'success');
  } catch (error) {
    showToast('카테고리 변경 실패', 'error');
  }
}

function getRandomColor() {
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ===== UI 헬퍼 =====

// 타이틀바 최대화 아이콘 업데이트
function updateMaximizeIcon(isMaximized) {
  if (isMaximized) {
    elements.maximizeIcon.style.display = 'none';
    elements.restoreIcon.style.display = 'block';
    elements.titlebarMaximize.title = '이전 크기로 복원';
  } else {
    elements.maximizeIcon.style.display = 'block';
    elements.restoreIcon.style.display = 'none';
    elements.titlebarMaximize.title = '최대화';
  }
}

async function updateMaximizeState() {
  const isMaximized = await window.electronAPI.windowIsMaximized();
  updateMaximizeIcon(isMaximized);
}

function showLoading() {
  elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  elements.loadingOverlay.style.display = 'none';
}

function showToast(message, type = '') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// ===== 앱 시작 =====
document.addEventListener('DOMContentLoaded', init);
