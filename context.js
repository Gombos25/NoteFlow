chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-highlight-notion') {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_NOTE',
        data: {
          mode: 'selection',
          quick: true,
          generateSummary: false,
          tags: ''
        }
      });
      
      if (response.success) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Saved to Notion',
          message: 'Highlight saved successfully!'
        });
      } else {
        throw new Error(response.error || 'Failed to save');
      }
    } catch (error) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Error',
        message: error.message || 'Failed to save highlight'
      });
    }
  }
});