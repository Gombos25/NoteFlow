// See SETUP.md for instructions on getting these credentials
const CLIENT_ID = 'YOUR_NOTION_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_NOTION_CLIENT_SECRET_HERE';
const REDIRECT_URI = chrome.identity.getRedirectURL('oauth2');

export async function beginOAuth() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  await chrome.storage.local.set({ codeVerifier });
  
  const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('owner', 'user');
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  
  try {
    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true
    });
    
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    const { codeVerifier: storedVerifier } = await chrome.storage.local.get('codeVerifier');
    const tokens = await exchangeCodeForTokens(code, storedVerifier);
    
    await chrome.storage.local.set({
      authData: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
        workspace_id: tokens.workspace_id,
        workspace_name: tokens.workspace_name,
        bot_id: tokens.bot_id
      }
    });
    
    await chrome.storage.local.remove('codeVerifier');
    
    return { success: true, workspace: tokens.workspace_name };
  } catch (error) {
    console.error('OAuth error:', error);
    throw error;
  }
}

async function exchangeCodeForTokens(code, codeVerifier) {
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  return response.json();
}

export async function refreshTokenIfNeeded() {
  const { authData } = await chrome.storage.local.get('authData');
  
  if (!authData || !authData.refresh_token) {
    return;
  }
  
  if (Date.now() < authData.expires_at - 60000) {
    return;
  }
  
  try {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: authData.refresh_token
      })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const tokens = await response.json();
    
    await chrome.storage.local.set({
      authData: {
        ...authData,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || authData.refresh_token,
        expires_at: Date.now() + (tokens.expires_in || 3600) * 1000
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    await logout();
    throw error;
  }
}

export async function logout() {
  await chrome.storage.local.remove(['authData', 'codeVerifier']);
  await chrome.storage.sync.remove(['selectedDatabase', 'selectedDatabaseName']);
  return { success: true };
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(hash));
}

function base64urlEncode(buffer) {
  const base64 = btoa(String.fromCharCode.apply(null, buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}