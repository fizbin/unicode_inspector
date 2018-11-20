
function testCpInfoURL() {
  let cpInfoURL = document.getElementById('cpInfoURL').value;
  // U+1F63B: SMILING CAT FACE WITH HEART-SHAPED EYES
  openForChar(String.fromCodePoint(0x1F63B), cpInfoURL);
}

function saveOptions() {
  let cpInfoURL = document.getElementById('cpInfoURL').value;
  let haveContextMenu = document.getElementById('ContextMenu').checked;
  let haveToolbarPopup = document.getElementById('ToolbarPopup').checked;
  chrome.storage.sync.set({cpInfoURL: cpInfoURL,
                           haveContextMenu: haveContextMenu,
                           haveToolbarPopup: haveToolbarPopup},
                          function () {
                            actOnPrefs();
                            resetOptions();
                          });
}

function resetOptions() {
  chrome.storage.sync.get(
    prefDefaults,
    function (items) {
      if (items) {
        document.getElementById('cpInfoURL').value = items.cpInfoURL;
        document.getElementById('ContextMenu').checked =
          items.haveContextMenu;
        document.getElementById('ToolbarPopup').checked =
          items.haveToolbarPopup;
        document.getElementById('prefSave').disabled = true;
      } else {
        console.error(chrome.runtime.lastError.message);
      }
    }
  );
}

function installHandlers() {
  resetOptions();
  var prefSave = document.getElementById('prefSave');
  function activateSave() {prefSave.disabled = false;}
  document.getElementById('cpInfoURL')
    .addEventListener('input', activateSave);
  document.getElementById('ContextMenu')
    .addEventListener('input', activateSave);
  document.getElementById('ToolbarPopup')
    .addEventListener('input', activateSave);
  prefSave.addEventListener('click', saveOptions);
  document.getElementById('prefReset').addEventListener('click', resetOptions);
  document.getElementById('cpInfoURLTest')
    .addEventListener('click', testCpInfoURL);
}

document.addEventListener("DOMContentLoaded", function(event) {
  installHandlers();
});
