document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.onConnect.addListener(function(port) {
        console.assert(port.name == "namechannel",
                        "Unknown port: " + JSON.stringify(port));
        // console.log("Port opened at " + new Date());
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
            // console.log("Port disconnected at " + new Date());
        });
    });
    chrome.runtime.onMessage.addListener((message) => {
        if (message && message.type == "OpenPopup") {
            window.open(chrome.runtime.getURL("popup.html"), '_blank');
        }
        return false;
    });
});
