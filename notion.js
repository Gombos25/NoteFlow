const NOTION_VERSION = '2022-06-28';
const API_BASE = 'https://api.notion.com/v1';

async function apiFetch(path, init = {}) {
  const { authData } = await chrome.storage.local.get('authData');
  
  if (!authData?.access_token) {
    throw new Error('Not authenticated');
  }
  
  const headers = {
    'Authorization': `Bearer ${authData.access_token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
    ...init.headers
  };
  
  let response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const waitTime = parseInt(retryAfter) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers
      });
    }
  }
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${error}`);
  }
  
  return response.json();
}

export async function searchDatabases(query = '') {
  const response = await apiFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        property: 'object',
        value: 'database'
      },
      query: query,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    })
  });
  
  return response.results.map(db => ({
    id: db.id,
    title: db.title[0]?.plain_text || 'Untitled',
    icon: db.icon?.emoji || '📝'
  }));
}

export async function createClipping({
  databaseId,
  title,
  url,
  content,
  tags,
  summary,
  sourceTitle,
  fullTextBlocks
}) {
  const properties = {
    'Title': {
      title: [{
        text: { content: title }
      }]
    },
    'Content': {
      select: {
        name: content.substring(0, 100) || 'Web Content'
      }
    },
    'URL': {
      url: url
    },
    'Source Title': {
      people: []  // Leave empty since we can't add people programmatically without their IDs
    },
    'Tags': {
      multi_select: tags.map(tag => ({ name: tag }))
    },
    'Saved At': {
      date: {
        start: new Date().toISOString()
      }
    }
  };
  
  if (summary) {
    properties['Summary'] = {
      rich_text: [{
        text: { content: summary }
      }]
    };
  }
  
  const page = await apiFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: {
        database_id: databaseId
      },
      properties
    })
  });
  
  if (fullTextBlocks && fullTextBlocks.length > 0) {
    const blocks = fullTextBlocks.flatMap(text => 
      text.split('\n\n').filter(Boolean).map(paragraph => ({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: paragraph.substring(0, 2000) }
          }]
        }
      }))
    );
    
    if (blocks.length > 0) {
      await apiFetch(`/blocks/${page.id}/children`, {
        method: 'PATCH',
        body: JSON.stringify({
          children: blocks.slice(0, 100)
        })
      });
    }
  }
  
  return page;
}