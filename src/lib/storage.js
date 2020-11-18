import uuid from 'uuid/v4';

function setTokens() {
  const sessionId = window.localStorage.getItem('sessionId');
  if (!sessionId) {
    window.localStorage.setItem('sessionId', uuid());
  }
}

window.setInterval(() => {
  setTokens();
}, 30000);

setTokens();
