import { beginOAuth, logout, refreshTokenIfNeeded } from './oauth.js';
import { searchDatabases, createClipping } from './notion.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-highlight-notion',
    title: 'Save highlight to Notion',
    contexts: ['selection']
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse).catch(error => {
    sendResponse({ success: false, error: error.message });
  });
  return true;
});

async function handleMessage(request, sender) {
  switch (request.type) {
    case 'SAVE_NOTE':
      return await handleSaveNote(request.data);
    
    case 'GET_STATUS':
      return await getStatus();
    
    case 'OAUTH_BEGIN':
      return await beginOAuth();
    
    case 'OAUTH_LOGOUT':
      return await logout();
    
    case 'LOAD_DATABASES':
      return await loadDatabases();
    
    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

async function handleSaveNote(data) {
  const { mode, tags, generateSummary: shouldGenerateSummary, databaseId, quick } = data;
  
  const authData = await getAuthData();
  if (!authData?.access_token) {
    throw new Error('Not authenticated');
  }
  
  const dbId = databaseId || (await getSelectedDatabase());
  if (!dbId) {
    throw new Error('No database selected');
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  let content = '';
  let fullTextBlocks = [];
  
  if (mode === 'selection' || quick) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });
    content = results[0]?.result || '';
    if (!content && mode === 'selection') {
      throw new Error('No text selected');
    }
    fullTextBlocks = content ? [content] : [];
  } else {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const article = document.querySelector('article') || document.querySelector('main') || document.body;
        return article.innerText.substring(0, 10000);
      }
    });
    content = results[0]?.result || 'Page content';
    fullTextBlocks = [content];
  }
  
  let summary = '';
  if (shouldGenerateSummary) {
    summary = await generateSummary(content);
  }
  
  const response = await createClipping({
    databaseId: dbId,
    title: tab.title || 'Untitled',
    url: tab.url,
    content: content.substring(0, 2000),
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    summary,
    sourceTitle: tab.title || 'Untitled',
    fullTextBlocks
  });
  
  return { success: true, pageId: response.id };
}

async function getStatus() {
  const authData = await getAuthData();
  const selectedDb = await getSelectedDatabase();
  const selectedDbName = await getSelectedDatabaseName();
  
  return {
    isAuthenticated: !!authData?.access_token,
    workspace: authData?.workspace_name || null,
    selectedDatabase: selectedDb,
    selectedDatabaseName: selectedDbName
  };
}

async function loadDatabases() {
  await refreshTokenIfNeeded();
  const authData = await getAuthData();
  
  if (!authData?.access_token) {
    throw new Error('Not authenticated');
  }
  
  const databases = await searchDatabases();
  return { success: true, databases };
}

async function getAuthData() {
  const result = await chrome.storage.local.get(['authData']);
  return result.authData;
}

async function getSelectedDatabase() {
  const result = await chrome.storage.sync.get(['selectedDatabase']);
  return result.selectedDatabase;
}

async function getSelectedDatabaseName() {
  const result = await chrome.storage.sync.get(['selectedDatabaseName']);
  return result.selectedDatabaseName;
}

async function generateSummary(text) {
  return 'Summary placeholder';
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-highlight-notion') {
    try {
      const result = await handleSaveNote({
        mode: 'selection',
        quick: true,
        generateSummary: false
      });
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Saved to Notion',
        message: 'Highlight saved successfully!'
      });
    } catch (error) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Error',
        message: error.message
      });
    }
  }
});