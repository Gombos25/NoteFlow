# Setup Instructions for NoteFlow

## Getting Your Notion Integration Credentials

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "NoteFlow Extension")
4. Select the workspace you want to use
5. Copy the OAuth client ID and client secret

## Configure the Extension

1. Open `oauth.js` in the extension folder
2. Replace the placeholder values:
   - `YOUR_NOTION_CLIENT_ID` with your actual client ID
   - `YOUR_NOTION_CLIENT_SECRET` with your actual client secret

## Important Security Notes

- NEVER commit your actual client secret to a public repository
- If you fork this project, make sure to use your own credentials
- Keep your client secret secure and don't share it

## For Development

If you're developing locally:
1. Load the extension in Chrome developer mode
2. The redirect URI will be automatically generated based on your extension ID
3. Add the redirect URI to your Notion integration settings