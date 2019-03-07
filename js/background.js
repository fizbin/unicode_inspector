'use strict';

chrome.runtime.onInstalled.addListener(function() {
  actOnPrefs();
});

function contextMenuListener(info, tab) {
  chrome.storage.local.set(
    {unistring: info.selectionText, justStorage: true, e: ''},
    function () {
      if (chrome.browserAction.openPopup) {
        chrome.browserAction.openPopup(
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

chrome.contextMenus.onClicked.addListener(contextMenuListener);

async function getCurrentTabSelection() {
  var foundtabs = await apiToPromise1(
    chrome.tabs.query, {active: true, currentWindow: true});
  var sels = await apiToPromise1(
    chrome.tabs.executeScript,
    foundtabs[0].id,
    {
      code: 'window.getSelection().toString()',
      allFrames: true
    });
  for (let sel of sels) {
    if (sel) {
      return sel;
    }
  }
  return '';
}

async function getTarget(message, sender, sendResponse) {
  try {
    var storageError = '';
    try {
      var items = await apiToPromise1(
        (...v) => chrome.storage.local.get(...v),
        {unistring: '', justStorage: false, e: ''});
    } catch (e) {
      storageError = e;
      items = {unistring: '', justStorage: false};
    }
    function fromStorage(outerError) {
      if (outerError && !storageError) {
        console.log(outerError);
        outerError = outerError + '; falling back to last string';
        sendResponse({data: items.unistring, e:outerError});
      } else if (outerError) {
        console.log(outerError);
        outerError = outerError
          + `, and getting the last string failed: ${storageError}`;
        sendResponse({data: items.unistring, e:outerError});
      } else if (storageError) {
        sendResponse({data: items.unistring, e:storageError});
      } else {
        sendResponse({data: items.unistring, e:items.e});
      }
    }
    if (items.justStorage) {
      await apiToPromise1((...v) => chrome.storage.local.set(...v),
                          {justStorage: false, e: ''});
      fromStorage();
    } else {
      try {
        var sel = await getCurrentTabSelection();
        if (sel) {
          sendResponse({data: sel});
          return;
        }
        fromStorage();
      } catch (e) {
        fromStorage(e);
      }
    }
  } catch (e) {
    sendResponse({e: e});
  }
}

function handleMessage(message, sender, sendResponse) {
  if (message && message.type === "GetTarget") {
    getTarget(message, sender, sendResponse);
    return true;
  }
  return false;
}

chrome.runtime.onMessage.addListener(handleMessage);

// Attach unconditionally; only matters if popup is set
async function browserActionListener(myTab) {
  var sel = '';
  try {
    sel = await getCurrentTabSelection();
    await apiToPromise1((...v) => chrome.storage.local.set(...v),
                        {unistring: sel, justStorage: true, e: ''});
  } catch (e) {
    await apiToPromise1((...v) => chrome.storage.local.set(...v),
                        {justStorage: true,
                         e: e + '; falling back to last string'});
  }
  window.open(chrome.runtime.getURL("popup.html"), '_blank');
}

chrome.browserAction.onClicked.addListener(browserActionListener);

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "namechannel",
                 "Unknown port: " + JSON.stringify(port));
  console.log("Port opened");
  port.onMessage.addListener(function(msg) {
    if (msg.queries !== undefined) {
      async function doAnswer(queries) {
        let answerpromises = queries.map(getNameBlock);
        let answers = {};
        for (let i = 0; i < answerpromises.length; i++) {
          answers[queries[i]] = await answerpromises[i];
        }
        port.postMessage({answers: answers});
      }
      doAnswer(msg.queries);
    }
  });
  port.onDisconnect.addListener(() => {
    console.log("Port disconnected");
  });
});
