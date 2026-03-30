const { app, BrowserWindow, session, shell } = require('electron');

const APP_URL = 'https://app.ytblock.space/';

const AD_DOMAINS = [
  'doubleclick.net','googleadservices.com','googlesyndication.com',
  'ads.youtube.com','static.doubleclick.net','adservice.google.com',
  'pagead2.googlesyndication.com','tpc.googlesyndication.com',
  'googleads.g.doubleclick.net','pubads.g.doubleclick.net',
  'securepubads.g.doubleclick.net','s0.2mdn.net',
  'video-ad-stats.googlevideo.com'
];

const AD_PATTERNS = ['/pagead/','/ptracking','/api/stats/ads','&ad_type=','adformat='];

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: 'YTBlock — Sem Anúncios',
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['<all_urls>'] },
    (details, callback) => {
      const url = details.url.toLowerCase();
      const blocked =
        AD_DOMAINS.some(d => url.includes(d)) ||
        AD_PATTERNS.some(p => url.includes(p));
      callback({ cancel: blocked });
    }
  );

  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      (function() {
        function skipAd() {
          const skip = document.querySelector('.ytp-ad-skip-button,.ytp-skip-ad-button');
          if (skip) { skip.click(); return; }
          const video = document.querySelector('video');
          if (video && document.querySelector('.ad-showing')) video.currentTime = video.duration;
        }
        new MutationObserver(skipAd).observe(document.documentElement,{childList:true,subtree:true});
        setInterval(skipAd, 300);
      })();
    `).catch(() => {});
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
