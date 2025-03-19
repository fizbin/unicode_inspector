'use strict';

const prefDefaults = Object.freeze({
  haveContextMenu: false,
  haveToolbarPopup: true,
  cpInfoURL: 'https://www.compart.com/en/unicode/U+{cp.u}'
});

function openForChar(ch, infoTxt) {
  var cp = ch.codePointAt(0);
  var cpShortHex = cp.toString(16);
  var cp46Hex = cpShortHex.padStart(4, '0');
  var cpDecimal = cp.toString(10);
  var utf8 = wtf8.encode(ch);
  var utf8percent =
      [...utf8].map((x) => {
        return '%' + x.charCodeAt(0).toString(16).padStart(2, '0');
      }).join('');
  function withCpInfoUrl(cpInfoURL) {
    if (cpInfoURL) {
      var url = cpInfoURL
          .replace('{cp}', cp46Hex)
          .replace('{cpShort}', cpShortHex)
          .replace('{cpDecimal}', cpDecimal)
          .replace('{cp.u}', cp46Hex.toUpperCase())
          .replace('{cpShort.u}', cpShortHex.toUpperCase())
          .replace('{utf8}', utf8percent);
      window.open(url, '_blank');
    }
  }
  if (infoTxt) {
    withCpInfoUrl(infoTxt);
  } else {
    chrome.storage.sync.get(
      prefDefaults,
      function (info) {
        if (info.cpInfoURL) {
          withCpInfoUrl(info.cpInfoURL);
        } else {
          var err = chrome.runtime.lastError;
          chrome.runtime.getBackgroundPage(function (bWind) {
            bWind.console.error(err.message);
          });
        }
      });
  }
}

function contextMenuListener(info, tab) {
  chrome.storage.local.set(
    {unistring: info.selectionText, justStorage: true, e: ''},
    function () {
      if (chrome.action.openPopup) {
        chrome.action.openPopup(
          function(w) {
            if (!w) {
              chrome.storage.local.set({justStorage: false, e: ''});
            }
          }
        );
      } else {
        window.open(chrome.runtime.getURL("popup.html"), '_blank');
      };
    });
}

function actOnPrefs() {
  chrome.storage.sync.get(
    prefDefaults,
    function (items) {
      if (items.haveToolbarPopup) {
        chrome.action.setPopup({popup: 'popup.html?popup=true'});
      } else {
        chrome.action.setPopup({popup: ''});
      }
      if (items.haveContextMenu) {
        chrome.contextMenus.create(
          {
            "id": "unidecode",
            "title": "Open in unicode inspector",
            "contexts": ["selection"]
          },
          () => {
            if (!chrome.runtime.lastError) {
              // errors mean already added
              chrome.contextMenus.onClicked
                .addListener(contextMenuListener);
            }
          });
      } else {
        chrome.contextMenus.remove(
          "unidecode",
          // ignore "not found" errors
          () => {chrome.runtime.lastError});
      }
    }
  );
}
