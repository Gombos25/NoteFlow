# Better Notion Web Clipper + Highlight Manager

A Chrome extension that clips web pages and highlights directly to your Notion databases with OAuth2 authentication and optional AI summaries.

## Features

- **OAuth2 Authentication**: Secure sign-in with Notion using official OAuth2 flow
- **Database Selection**: Choose from your Notion databases
- **Flexible Clipping**: Save full pages or just selected text
- **Context Menu**: Right-click highlighted text to save instantly
- **Tags Support**: Add comma-separated tags to organize your clips
- **AI Summary**: Optional AI-generated summaries (currently stubbed)
- **Rate Limiting**: Handles Notion API rate limits gracefully

## Setup Instructions

### 1. Create a Notion OAuth App

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the basic information:
   - Name: "Better Notion Clipper"
   - Associated workspace: Select your workspace
   - Type: Select "Public integration"
4. Navigate to "OAuth" tab
5. Add redirect URI: `https://<extension-id>.chromiumapp.org/oauth2`
   - You'll get the extension ID after loading the extension (see step 3)
6. Copy your OAuth credentials:
   - **Client ID**
   - **Client Secret**

### 2. Configure the Extension

1. Open `oauth.js` in the extension folder
2. Replace the placeholders with your credentials:
   ```javascript
   const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
   const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
   const REDIRECT_URI = 'https://<extension-id>.chromiumapp.org/oauth2';
   ```

### 3. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `notion-clipper` folder
5. Copy the extension ID shown on the extension card
6. Update the `REDIRECT_URI` in `oauth.js` with your extension ID
7. Go back to your Notion OAuth app settings and update the redirect URI with the correct extension ID
8. Click "Reload" on the extension card in Chrome

### 4. Create Notion Database

Create a Notion database with these exact property names and types:

| Property Name | Property Type |
|--------------|--------------|
| Title | Title |
| Content | Rich Text |
| URL | URL |
| Source Title | Rich Text |
| Tags | Multi-select |
| Saved At | Date |
| Summary | Rich Text |

### 5. Using the Extension

1. Click the extension icon in Chrome toolbar
2. Click "Sign in with Notion"
3. Authorize the integration
4. Select your target database
5. Choose clipping options:
   - **Full Page**: Saves the entire page content
   - **Selection Only**: Saves only highlighted text
   - **Generate Summary**: Creates an AI summary (currently returns placeholder)
6. Add tags (optional)
7. Click "Save to Notion"

## Features

### Popup Interface
- Sign in/out with Notion
- Database picker
- Tags input
- Save mode selection (Full Page/Selection)
- AI summary option (stub)

### Context Menu
- Right-click any selected text
- Choose "Save highlight to Notion"
- Saves to your last selected database

### Background Processing
- Token management with automatic refresh
- Rate limit handling
- Secure OAuth2 with PKCE

## AI Summary Integration

The AI summary feature is currently stubbed. To integrate a real AI service:

1. Locate the `generateSummary` function in `service_worker.js`
2. Replace the placeholder return with your AI API call:

```javascript
async function generateSummary(text) {
  // Current stub:
  return 'Summary placeholder';
  
  // Replace with your AI service:
  // const response = await fetch('YOUR_AI_API_ENDPOINT', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': 'Bearer YOUR_API_KEY',
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({ text })
  // });
  // const data = await response.json();
  // return data.summary;
}
```

## Troubleshooting

### "Not authenticated" error
- Ensure you've signed in via the popup
- Check that OAuth credentials are correctly set in `oauth.js`

### "No database selected" error
- Select a database from the dropdown in the popup
- Ensure your Notion workspace has at least one database

### Rate limiting
- The extension automatically retries once after receiving a rate limit response
- If you continue to hit rate limits, wait a moment before trying again

### Database not appearing
- Ensure the integration has access to your workspace
- Check that you have edit permissions for the database
- Try refreshing the database list

## Security Notes

- OAuth tokens are stored securely in Chrome's local storage
- PKCE is implemented for additional OAuth security
- No credentials are exposed in the extension code
- All API calls use HTTPS

## Development

### File Structure
```
notion-clipper/
├── manifest.json       - Chrome extension manifest (MV3)
├── service_worker.js   - Background service worker
├── oauth.js           - OAuth implementation with PKCE
├── notion.js          - Notion API integration
├── context.js         - Context menu handler
├── popup.html         - Popup UI structure
├── popup.js           - Popup UI logic
├── popup.css          - Popup styling
└── icons/             - Extension icons (placeholder)
```

### API Version
- Notion API Version: `2022-06-28`
- Chrome Manifest Version: 3

## License

MIT