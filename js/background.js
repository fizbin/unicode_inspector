'use strict';

importScripts('util.js');

chrome.runtime.onInstalled.addListener(function() {
  actOnPrefs();
});


function windowSelectionString() { return window.getSelection().toString(); }

async function getCurrentTabSelection() {
  var foundtabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  var sels = await chrome.scripting.executeScript({
    target: {tabId: foundtabs[0].id, allFrames: true},
    func: windowSelectionString,
    });
  for (let sel of sels) {
    if (sel.result) {
      return sel.result;
    }
  }
  return '';
}

async function getTarget(message, sender, sendResponse) {
  try {
    var storageError = '';
    try {
      var items = await chrome.storage.local.get({unistring: '', justStorage: false, e: ''});
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
      await chrome.storage.local.set({justStorage: false, e: ''});
      fromStorage();
    } else {
      try {
        var sel = await getCurrentTabSelection();
        if (sel) {
          sendResponse({type:"currentSelection", data: sel});
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

chrome.contextMenus.onClicked.addListener(contextMenuListener);

// All I ever do with alarms is close the offscreen document
chrome.alarms.onAlarm.addListener((alarm) => {chrome.offscreen.closeDocument();});

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  chrome.alarms.create('close-offscreen', {
    delayInMinutes: 5,
  });
  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    // console.info(`Trying to load document at ${path} ...`);
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['IFRAME_SCRIPTING'],
      justification: 'Dynamically load only needed unicode blocks into memory',
    });
    await creating;
    creating = null;
  }
}

function ensureGetBlock(message, sender, sendResponse) {
  setupOffscreenDocument('get_block.html').then(() => {sendResponse(true)});
}

function handleMessage(message, sender, sendResponse) {
  if (message && message.type === "GetTargetf") {
    getTarget(message, sender, sendResponse);
    return true;
  }
  if (message && message.type == "EnsureGetBlock") {
    ensureGetBlock(message, sender, sendResponse);
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
    await chrome.storage.local.set({unistring: sel, justStorage: true, e: ''});
  } catch (e) {
    await chrome.storage.local.set({justStorage: true,
                                    e: e + '; falling back to last string'});
  }

  ensureGetBlock({}, '', () => {
    chrome.runtime.sendMessage({type: "OpenPopup"});
  });
}

chrome.action.onClicked.addListener(browserActionListener);
