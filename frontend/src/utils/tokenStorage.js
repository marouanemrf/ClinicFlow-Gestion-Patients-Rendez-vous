// sessionStorage: the session survives a page refresh but ends when the tab is closed.
const TOKEN_KEY = 'clinicflow.token';

function safely(action, fallback = null) {
  try {
    return action();
  } catch {
    return fallback;
  }
}

export const tokenStorage = {
  get: () => safely(() => sessionStorage.getItem(TOKEN_KEY)),
  set: (token) => safely(() => sessionStorage.setItem(TOKEN_KEY, token)),
  clear: () => safely(() => sessionStorage.removeItem(TOKEN_KEY)),
};
