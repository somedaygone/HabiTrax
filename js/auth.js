// auth.js — MSAL.js v3 (browser) auth wrapper

const MSAL_CONFIG = {
  auth: {
    clientId: '7b269030-c069-46fc-9ea6-d32c310acee2',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5500/'
      : 'https://somedaygone.github.io/HabiTrax',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

const LOGIN_SCOPES = ['User.Read', 'Files.ReadWrite'];

const msalInstance = new msal.PublicClientApplication(MSAL_CONFIG);

async function initAuth() {
  await msalInstance.initialize();
  const result = await msalInstance.handleRedirectPromise();
  if (result && result.account) {
    msalInstance.setActiveAccount(result.account);
  }
}

function getAccount() {
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0] : null;
}

async function signIn() {
  await msalInstance.loginRedirect({ scopes: LOGIN_SCOPES });
}

async function signOut() {
  const account = getAccount();
  await msalInstance.logoutRedirect({ account });
}

async function getToken() {
  const account = getAccount();
  if (!account) throw new Error('No account — please sign in');

  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes: LOGIN_SCOPES,
      account,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof msal.InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ scopes: LOGIN_SCOPES, account });
    }
    throw err;
  }
}

window.auth = { initAuth, getAccount, signIn, signOut, getToken };
