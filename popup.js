let currentSelection = '';

document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
});

async function initializePopup() {
  const status = await sendMessage({ type: 'GET_STATUS' });
  
  if (status.isAuthenticated) {
    showMainSection(status.workspace);
    await loadDatabases(status.selectedDatabase);
    await checkForSelection();
  } else {
    showAuthSection();
  }
}

function showAuthSection() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('main-section').classList.add('hidden');
  document.getElementById('auth-status').textContent = 'Not signed in';
}

function showMainSection(workspace) {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('main-section').classList.remove('hidden');
  document.getElementById('auth-status').textContent = `Signed in as ${workspace}`;
}

async function loadDatabases(selectedId) {
  const select = document.getElementById('database-select');
  
  try {
    const response = await sendMessage({ type: 'LOAD_DATABASES' });
    
    if (response.success && response.databases) {
      select.innerHTML = '<option value="">Select a database...</option>';
      
      response.databases.forEach(db => {
        const option = document.createElement('option');
        option.value = db.id;
        option.textContent = `${db.icon} ${db.title}`;
        if (db.id === selectedId) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      
      if (selectedId && !select.value) {
        showStatus('Previously selected database not found', 'error');
      }
    }
  } catch (error) {
    select.innerHTML = '<option value="">Failed to load databases</option>';
    showStatus(error.message, 'error');
  }
}

async function checkForSelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });
    
    currentSelection = results[0]?.result || '';
    updateSaveButton();
  } catch (error) {
    console.error('Failed to check selection:', error);
  }
}

function setupEventListeners() {
  document.getElementById('sign-in-btn').addEventListener('click', handleSignIn);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('database-select').addEventListener('change', handleDatabaseChange);
  
  document.querySelectorAll('input[name="save-mode"]').forEach(radio => {
    radio.addEventListener('change', updateSaveButton);
  });
}

async function handleSignIn() {
  const btn = document.getElementById('sign-in-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  
  try {
    const response = await sendMessage({ type: 'OAUTH_BEGIN' });
    if (response.success) {
      await initializePopup();
    }
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in with Notion';
  }
}

async function handleLogout() {
  if (confirm('Are you sure you want to sign out?')) {
    await sendMessage({ type: 'OAUTH_LOGOUT' });
    showAuthSection();
  }
}

async function handleSave() {
  const databaseId = document.getElementById('database-select').value;
  if (!databaseId) {
    showStatus('Please select a database', 'error');
    return;
  }
  
  const mode = document.querySelector('input[name="save-mode"]:checked').value;
  const tags = document.getElementById('tags-input').value;
  const generateSummary = document.getElementById('generate-summary').checked;
  
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  try {
    const response = await sendMessage({
      type: 'SAVE_NOTE',
      data: {
        mode,
        tags,
        generateSummary,
        databaseId
      }
    });
    
    if (response.success) {
      showStatus('Saved successfully!', 'success');
      
      await chrome.storage.sync.set({
        lastTags: tags,
        lastMode: mode,
        lastGenerateSummary: generateSummary
      });
    } else {
      throw new Error(response.error || 'Failed to save');
    }
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save to Notion';
  }
}

async function handleDatabaseChange(e) {
  const select = e.target;
  const selectedOption = select.options[select.selectedIndex];
  
  if (select.value) {
    await chrome.storage.sync.set({
      selectedDatabase: select.value,
      selectedDatabaseName: selectedOption.textContent
    });
  }
}

function updateSaveButton() {
  const mode = document.querySelector('input[name="save-mode"]:checked')?.value;
  const btn = document.getElementById('save-btn');
  
  if (mode === 'selection' && !currentSelection) {
    btn.disabled = true;
    btn.classList.add('tooltip');
    btn.setAttribute('data-tooltip', 'No text selected on the page');
  } else {
    btn.disabled = false;
    btn.classList.remove('tooltip');
    btn.removeAttribute('data-tooltip');
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message show ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 3000);
  }
}

async function sendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('Message error:', error);
    throw error;
  }
}

async function loadLastSettings() {
  const settings = await chrome.storage.sync.get(['lastTags', 'lastMode', 'lastGenerateSummary']);
  
  if (settings.lastTags) {
    document.getElementById('tags-input').value = settings.lastTags;
  }
  
  if (settings.lastMode) {
    document.querySelector(`input[name="save-mode"][value="${settings.lastMode}"]`).checked = true;
  }
  
  if (settings.lastGenerateSummary !== undefined) {
    document.getElementById('generate-summary').checked = settings.lastGenerateSummary;
  }
}

window.addEventListener('load', loadLastSettings);