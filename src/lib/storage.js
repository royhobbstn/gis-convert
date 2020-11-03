import uuid from 'uuid/v4';

const hours_8 = 1000 * 60 * 60 * 8;

function setTokens() {
  const sessionId = window.localStorage.getItem('sessionId');
  const lastAccessed = window.localStorage.getItem('lastAccessed');
  const now = Date.now();
  if (!sessionId || !lastAccessed || now > Number(lastAccessed) + hours_8) {
    window.localStorage.setItem('sessionId', uuid());
    window.localStorage.setItem('lastAccessed', now);
  }
}

window.setInterval(() => {
  setTokens();
}, 30000);

setTokens();
