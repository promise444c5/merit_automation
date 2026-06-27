// ==UserScript==
// @name         Bitcointalk Merit Automation [No_Post_Trigger]
// @namespace    http://...
// @version      1.0
// @description  Queue posts to merit them later with precise time execution.. User has to login for scrpt to load.
// @author       promise444c5
// @match        https://bitcointalk.org/index.php?topic=*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(() => {
  "use strict";

  const getLocalISOTime = (dateObj) => {
    const offset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj - offset).toISOString().slice(0, 16);
  };

  GM_addStyle(`
        /* Modal Overlay */
        #merit-queue-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(3px); }

        /* Modal */
        #merit-queue-content {
            background-color: #ffffff; margin: 4% auto; padding: 24px; border-radius: 12px;
            width: 85%; max-width: 850px; max-height: 85vh; /* Keep within viewport */
            display: flex; flex-direction: column; /* Allows nested list to fill space & scroll */
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); color: #333; font-family: system-ui, -apple-system, sans-serif;
            box-sizing: border-box; max-height: 80vh; overflow-y: auto; to #merit-queue-content
        }

        /* Header & Close */
        .mq-close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; transition: color 0.2s; line-height: 1; }
        .mq-close:hover { color: #e74c3c; }
        #merit-queue-content h2 { margin-top: 0; margin-bottom: 5px; border-bottom: 2px solid #f0f0f0; padding-bottom: 12px; font-size: 20px; color: #2c3e50;}

        /* Scrolling List */
        #mq-list {
            flex-grow: 1; overflow-y: auto; overflow-x: hidden;
            padding-right: 12px; margin: 15px 0;
            display: flex; flex-direction: column; gap: 10px;
        }

        /* Smooth Scrollbar for mq-list */
        #mq-list::-webkit-scrollbar { width: 8px; }
        #mq-list::-webkit-scrollbar-track { background: #f8f9fa; border-radius: 4px; }
        #mq-list::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        #mq-list::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }

        /* Queue Item Cards */
        .mq-item {
            display: flex; align-items: center; justify-content: space-between;
            background: #f8f9fc; padding: 16px; border-radius: 8px; border: 1px solid #eaedf1;
            transition: all 0.2s ease-in-out;
            flex-wrap: wrap; gap: 10px;
        }
        .mq-item > div:nth-child(2) {
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;

         }
        .mq-item:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.05); border-color: #d1d5db; flex:wrap }

        /* Inputs & Form Elements */
        .mq-amount, .mq-date { padding: 6px 10px; border: 0.5px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 13px; color: #333; outline: none; transition: border-color 0.2s; }
        .mq-amount:focus, .mq-date:focus { border-color: #3b82f6; }

        /* Action Buttons */
        .mq-remove {
            background: #fee2e2; color: #ef4444; border: none; border-radius: 50%;
            width: 32px; height: 32px; font-weight: bold; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 20px;
            margin: 0 !important;
            flex-shrink: 0;
        }
        .mq-remove:hover { background: #fca5a5; color: #7f1d1d; transform: scale(1.05); }

        #mq-save-container { text-align: center; margin-top: auto; padding-top: 15px; border-top: 2px solid #f0f0f0; }
        #mq-save-btn {
            padding: 12px 35px; font-size: 15px; font-weight: 600; cursor: pointer;
            background: #047857; color: #fff;
            border: none; border-radius: 6px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); transition: all 0.2s;
        }
        #mq-save-btn:hover { background: #059669; box-shadow: 0 6px 14px rgba(16, 185, 129, 0.4); translateY(-1px); }
        #mq-save-btn:active { transform: translateY(2px); box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3); }

        #open-mq-btn { position: fixed; bottom: 25px; right: 25px; padding: 12px 20px; font-weight: 600; background: #375f82; color: white; border: none; border-radius: 50px; cursor: pointer; z-index: 9998; box-shadow: 0 6px 12px rgba(59, 130, 246, 0.3); transition: transform 0.2s; }
        #open-mq-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4); opacity:0.95; background:#3e6488 }`);

  /* Loads active queue from storage on script initialization*/
  let meritQueue = GM_getValue("merit_queue", []);

  const queueBtnTemplate = document.createElement("a");
  queueBtnTemplate.href = "javascript:void(0);";
  queueBtnTemplate.innerHTML =
    '&nbsp;&nbsp;<span style="vertical-align: middle;"><b>+Queue</b></span>';

  const topicMatch = window.location.href.match(/topic=(\d+)/);
  const topicId = topicMatch ? topicMatch[1] : "0";


  document.querySelectorAll('a[href*="action=merit;msg="]').forEach((link) => {
    const match = link.href.match(/msg=(\d+)/);
    if (!match) return;

    const [, msgId] = match;

    /* Optional Chaining & Nullish Coalescing */
    const username =
      link
        .closest(".windowbg, .windowbg2")
        ?.querySelector(".poster_info b a")
        ?.textContent.trim() ?? "Unknown";

    const queueBtn = queueBtnTemplate.cloneNode(true);
    queueBtn.addEventListener("click", (e) => {
      e.preventDefault();
      /* confirmation dialog, for unexpected clicks  */
      if (confirm(`Are you sure you want to queue 1 merit for ${username}?`)) {
        addToQueue(topicId, msgId, username);
      }
    });

    link.parentNode.insertBefore(queueBtn, link.nextSibling);
  });

  const addToQueue = (topicId, msgId, username) => {
    if (meritQueue.some((item) => item.msgId === msgId))
      return alert("Post is already in the queue!");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    meritQueue = [
      ...meritQueue,
      {
        topicId,
        msgId,
        username,
        amount: 1,
        date: getLocalISOTime(tomorrow),
      },
    ];
    console.log("Updated Merit Queue:", meritQueue);
    GM_setValue("merit_queue", meritQueue);
    alert(`Added a post from ${username} to Merit Queue`);
  };

  /* Modal*/
  document.body.insertAdjacentHTML(
    "beforeend",
    `
        <div id="merit-queue-modal">
            <div id="merit-queue-content">
                <div>
                  <span class="mq-close">&times;</span>
                  <h2 style="margin-top:0; border-bottom:2px solid #ccc; padding-bottom:10px;">Merit Queue Settings</h2>
                </div>
                <div id="mq-list"></div>
                <div id="mq-save-container"><button id="mq-save-btn">Save Changes</button></div>
            </div>
        </div>
        <button id="open-mq-btn">View Merit Queue</button>
    `,
  );

  const modal = document.getElementById("merit-queue-modal");
  const listContainer = document.getElementById("mq-list");

  const renderQueue = () => {
    if (!meritQueue.length) {
      listContainer.innerHTML = "<p>No posts in queue.</p>";
      return;
    }

    /*Queue items */
    listContainer.innerHTML = meritQueue
      .map((item, index) => {
        const predefinedMeritValues = [1, 2, 3, 4, 6, 8, 10, 20, 40, 50];
        const options = predefinedMeritValues
          .map(
            (i) =>
              `<option value="${i}" ${item.amount == i ? "selected" : ""}>${i}</option>`,
          )
          .join("");

        return `
                <div class="mq-item" ${item.status === "failed" ? 'style="background-color: #ffe6e6; padding: 10px;"' : ""}>
                    <div>
                        <strong>User: ${item.username}</strong><br>
                        <a href="https://bitcointalk.org/index.php?topic=${item.topicId}.msg${item.msgId}#msg${item.msgId}" target="_blank" style="font-size:12px;">Link to Msg: #${item.msgId}</a>
                        ${item.error ? `<br><span style="color:red; font-size:12px;"><b>Error:</b> ${item.error}</span>` : ""}
                    </div>
                    <div>
                        <label>Merit: <select class="mq-amount" data-index="${index}">${options}</select></label>
                        <label style="margin-left: 15px;">Date & Time: <input type="datetime-local" class="mq-date" data-index="${index}" value="${item.date}"></label>
                        <button class="mq-remove" data-index="${index}" title="Remove from queue" style="margin-left: 15px; color: red;">X</button>
                    </div>
                </div>
            `;
      })
      .join("");
  };

  /* remove button */
  listContainer.addEventListener("click", (e) => {
    if (e.target?.classList.contains("mq-remove")) {
      meritQueue.splice(e.target.dataset.index, 1);
      GM_setValue("merit_queue", meritQueue);
      renderQueue();
    }
  });

  document.getElementById("open-mq-btn").onclick = () => {
    meritQueue = GM_getValue("merit_queue", []);
    renderQueue();
    modal.style.display = "block";
  };

  document.querySelector(".mq-close").onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  };

  document.getElementById("mq-save-btn").onclick = () => {
    document.querySelectorAll(".mq-amount").forEach((sel) => {
      meritQueue[sel.dataset.index].amount = sel.value;
    });

    document.querySelectorAll(".mq-date").forEach((inp) => {
      meritQueue[inp.dataset.index].date = inp.value;
    });

    GM_setValue("merit_queue", meritQueue);
    alert("Queue settings successfully saved!");
    modal.style.display = "none";
  };

  /* Main automation logic */
  const processMeritQueue = async () => {
    const queue = GM_getValue("merit_queue", []);
    if (!queue.length) return;

    const currentLocalTime = getLocalISOTime(new Date());

    const sc = document
      .querySelector('a[href*="action=logout;sesc="]')
      ?.href.match(/sesc=([a-f0-9]+)/)?.[1];

    if (!sc) return;

    let updatedQueue = [...queue];
    let hasChanges = false;

    for (const item of queue) {
      // Evaluates precise minute accuracy instead of just the day
      if (item.date <= currentLocalTime) {
        console.log(
          `Time reached! Attempting to dispense ${item.amount} merit to MsgID ${item.msgId}...`,
        );

        const formData = new URLSearchParams({
          merits: item.amount,
          msgID: item.msgId,
          sc,
        });

        try {
          const response = await fetch(
            `https://bitcointalk.org/index.php?action=merit;msg=${item.msgId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              },
              body: formData.toString(),
            },
          );

          if (response.ok) {
            const html = await response.text();

            if (html.includes("An Error Has Occurred")) {
              console.error(`Failed to send merit for MsgID ${item.msgId}`);
              let errorMsg = "Unknown error occurred.";

              const lowerHtml = html.toLowerCase();

              /** Checks for error
               * Note: not sure about the exact message for "no merit" yet, so I'm doing a contains check for "enough smerit" which should cover both "not enough sMerit" and "you don't have any sMerit" maybe
               * For any reason , if the error message doesn't match or there are changes in the future, it will default to "Unknown error occurred." instead of just saying "Failed to send merit" which is less informative for the user.
               * */

              if (lowerHtml.includes("enough smerit")) {
                errorMsg = "Not enough sMerit.";
              } else if (lowerHtml.includes("cannot send merit to yourself")) {
                errorMsg = "Cannot send merit to yourself tuff guy.";
              }

              /* Flags the failed item in the queue instead of deleting it */
              const failedItem = updatedQueue.find(
                (q) => q.msgId === item.msgId,
              );
              if (failedItem) {
                failedItem.status = "failed";
                failedItem.error = errorMsg;
              }
              hasChanges = true;
            } else {
              /* Success case: Successfully sent merit posts are removed from queue */
              console.log(
                `Successfully sent ${item.amount} merit for MsgID ${item.msgId}`,
              );
              updatedQueue = updatedQueue.filter(
                ({ msgId }) => msgId !== item.msgId,
              );
              hasChanges = true;
            }
          }

          await new Promise((res) => setTimeout(res, 3000)); // wait to prevent rate-limiting
        } catch (err) {
          console.error(
            "Error dispensing merit, keeping in queue:",
            err,
          );
        }
      } else console.log("Time not Fufiiled yet...");
    }

    if (hasChanges) GM_setValue("merit_queue", updatedQueue);
  };

  processMeritQueue();
})();
