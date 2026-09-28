// ==UserScript==
// @name         Bitcointalk Merit Automation [Post_Trigger]
// @namespace    https://greasyfork.org/users/1613258
// @version      1.1.0
// @description  Queue posts to merit them later on next post.. User has to login for script to load.
// @author       promise444c5
// @match        https://bitcointalk.org/index.php?topic=*
// @match        https://bitcointalk.org/index.php?action=post*
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

(() => {
  "use strict";

  GM_addStyle(`
       /* Modal Overlay */
        #merit-queue-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(3px); }

        /* Modal */
        #merit-queue-content {
            background-color: #ffffff; margin: 4% auto; padding: 24px; border-radius: 12px;
            width: 85%; max-width: 950px; max-height: 85vh; /* Keep within viewport */
            display: flex; flex-direction: column; /* Allows nested list to fill space & scroll */
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); color: #333; font-family: system-ui, -apple-system, sans-serif;
            box-sizing: border-box; overflow-y: auto; 
        }

        /* Header & Close */
        .mq-close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; transition: color 0.2s; line-height: 1; }
        .mq-close:hover { color: #e74c3c; }
        #merit-queue-content h2 { margin-top: 0; margin-bottom: 5px; border-bottom: 2px solid #f0f0f0; padding-bottom: 12px; font-size: 20px; color: #2c3e50;}

        /* Scrolling List */
        #mq-list {
            flex-grow: 1 1 auto; min-height: 0;
            overflow-y: auto; overflow-x: hidden;
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
            background: #f8d7da; color: #ef4444; border: none; border-radius: 50%;
            width: 32px; height: 32px; font-weight: bold; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 20px;
            margin: 0 !important;
            flex-shrink: 0;
        }
        .mq-remove:hover { background: #fca5a5; color: #7f1d1d; transform: scale(1.05); }
        #mq-force-send {
            background: #f6bec4db; color: #721C24; border: none; border-radius: 50%;
            width: 32px; height: 32px; font-weight: bold; cursor: pointer;
            display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: 5px;
            margin: 0 !important;
            flex-shrink: 0;
        }
        #mq-smerit-tracker { 
            flex-grow: 0 0 auto; margin-top:5px; padding: 10px; border-radius: 4px;
            font-size: 12px; color: #333; display: flex; flex-direction: column; 
            gap: 4px; border-top: 2px solid #f0f0f0;
          }

        #mq-smerit-tracker p { width: 100%; margin: 0; font-size: 12px; line-height: 1.35; display: flex; justify-content: left; gap:5px }

        #mq-smerit-tracker strong { color: #64748b; font-weight: 600; }
        #mq-smerit-tracker span { font-weight: 700;}

        #mq-total-smerit,
        #mq-source-smerit { color: #15803d;}
        #mq-queued-smerit, #mq-remaining-smerit,#mq-remaining-source-smerit { color: #b91c1c;}

        #mq-force-send:hover { background: #fdba74; color: #78350f; transform: scale(1.05); }

        #mq-save-container { flex: 0 0 auto; text-align: center; margin-top: auto; padding-top: 15px; border-top: 2px solid #f0f0f0; }

        #mq-save-btn {
            padding: 12px 35px; font-size: 15px; font-weight: 600; cursor: pointer;
            background: #047857; color: #fff;
            border: none; border-radius: 6px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); transition: all 0.2s;
        }
        #mq-save-btn:hover { background: #059669; box-shadow: 0 6px 14px rgba(16, 185, 129, 0.4); translateY(-1px); }
        #mq-save-btn:active { transform: translateY(2px); box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3); }


        #open-mq-btn { position: fixed; bottom: 25px; right: 25px; padding: 12px 20px; font-weight: 600; background: #375f82; color: white; border: none; border-radius: 50px; cursor: pointer; z-index: 9998; box-shadow: 0 6px 12px rgba(59, 130, 246, 0.3); transition: transform 0.2s; }
        #open-mq-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4); opacity:0.95; background:#3e6488 }`);

  const LOCK_KEY = "merit_queue_lock";
  const LOCK_DURATION = 60000;

  /* Loads active queue from storage on script initialization*/
  let meritQueue = GM_getValue("MERIT_QUEUE", []);

  /*sMerits stats */
  let cachedMeritStats = GM_getValue("MERIT_STATS", null);
  let cachedMeritStatsAt = GM_getValue("MERIT_STATS_TIME_LOG", 0);

  const queueBtnTemplate = document.createElement("a");
  queueBtnTemplate.href = "javascript:void(0);";
  queueBtnTemplate.innerHTML =
    '&nbsp;<span style="vertical-align: middle;"><b>+Queue</b></span>';

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

    meritQueue = [
      ...meritQueue,
      {
        id: `${Date.now()}-${msgId}`,
        topicId,
        msgId,
        username,
        amount: 1,
        forceSend: false,
        attempts: 0,
      },
    ];

    GM_setValue("MERIT_QUEUE", meritQueue);
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
               <div>
                <div id="mq-smerit-tracker">
                 <p><strong>sMerit:</strong> <span id="mq-total-smerit">0</span></p>
                 <p><strong>Source sMerit:</strong> <span id="mq-source-smerit">0</span></p>
                 <p><strong>Queued sMerit:</strong> <span id="mq-queued-smerit">0</span></p> 
                 <p><strong>Remaining sMerit:</strong> <span id="mq-remaining-smerit">0</span></p>
                 <p><strong>Remaining Source sMerit:</strong> <span id="mq-remaining-source-smerit">0</span></p>
                </div>
                <div id="mq-save-container"><button id="mq-save-btn">Save Changes</button></div>
                </div>
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

    verifyAndUpdateMeritStats();

    /* Queue items */
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
                        ${item.error && !item.forceSend ? `<br><span style="color:red; font-size:12px;"><b>Error:</b> ${item.error}</span><br>` : ""}
                    </div>
                    <div>
                        <label>Merit: <select class="mq-amount" data-index="${index}">${options}</select></label>
                        <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        ${item.error && !item.forceSend ? `<button id="mq-force-send" data-index="${index}" title="Force send merit (ignores history log check)" style="margin-left: 5px; color: #721c24;">!</button>` : ""}
                        <button class="mq-remove" data-index="${index}" title="Remove from queue" style="margin-left: 15px; color: red;">X</button>
                        </div>
                    </div>
                </div>
            `;
      })
      .reverse()
      .join("");
  };

  /* remove button */
  listContainer.addEventListener("click", (e) => {
    if (e.target?.classList.contains("mq-remove")) {
      meritQueue.splice(e.target.dataset.index, 1);
      renderQueue();
    }
  });

  listContainer.addEventListener("change", (e) => {
    if (e.target?.classList.contains("mq-amount")) {
      const index = e.target.dataset.index;
      meritQueue[index].amount = parseInt(e.target.value, 10);
      verifyAndUpdateMeritStats();
    }
  });
  /* force send button */
  listContainer.addEventListener("click", (e) => {
    if (e.target?.id === "mq-force-send") {
      const index = e.target.dataset.index;
      meritQueue[index].forceSend = true;
      renderQueue();
    }
  });

  document.getElementById("open-mq-btn").onclick = () => {
    meritQueue = GM_getValue("MERIT_QUEUE", []);
    renderQueue();

    modal.style.display = "block";
  };

  document.querySelector(".mq-close").onclick = () => {
    // Shows a warning if there are unsaved changes in the merit queue
    if (!arraysEqual(meritQueue, GM_getValue("MERIT_QUEUE", []))) {
      if (
        !confirm(
          "You have unsaved changes. Are you sure you want to close the modal?",
        )
      ) {
        return;
      }
    }
    modal.style.display = "none";
  };

  window.onclick = (e) => {
      // console.log("arraysEqual check:", arraysEqual(meritQueue, GM_getValue("MERIT_QUEUE", [])));
    if (e.target === modal) {
      if (!arraysEqual(meritQueue, GM_getValue("MERIT_QUEUE", []))) {
        console.log("Arrays are not equal");
        if (!confirm("You have unsaved changes. Are you sure you want to close the modal?",
          )
        ) {
          return;
        }
      }
      modal.style.display = "none";
    }
  };
 
  
  document.getElementById("mq-save-btn").onclick = () => {
    //todo update dircet with new meritqeue data,select should update smerit stats if possible
    GM_setValue("MERIT_QUEUE", meritQueue);
    verifyAndUpdateMeritStats();
    alert("Queue settings successfully saved!");
  };

  /*
   ** Main automation logic
   */
  const processMeritQueue = async () => {
    const queue = GM_getValue("MERIT_QUEUE", []);
    const attempt = GM_getValue("POST_ATTEMPT", null);

    if (!attempt) return;
    if (!queue.length) {
      console.log("Merit queue is empty. Nothing to process.");
      return;
    }

    const isNewPost =
      location.hash === "#new" && location.href.includes("topic=");

    console.log(
      "Post submission detected, checking conditions for merit queue processing...",
      { isNewPost, attemptTime: attempt, currentTime: Date.now() },
    ); // for testing , to be stripped..

    if (!isNewPost) {
      console.log("Not a new post submission.");
      return;
    }

    if (!acquireLock()) {
      console.log(
        "Another merit queue process is currently running. Aborting this attempt..",
      );
      return;
    }

    try {
      GM_deleteValue("POST_ATTEMPT");
      const sc = document
        .querySelector('a[href*="action=logout;sesc="]')
        ?.href.match(/sesc=([a-f0-9]+)/)?.[1];

      if (!sc) {
        console.error(
          "Cannot proceed with merit dispensing. Make sure you are logged in ",
        );
        return;
      }

      for (let i = queue.length - 1; i >= 0; i--) {
        let item = queue[i];
        if (!item) continue;

        /* Prevent unnecessary network requests for known failed items */
        if (item.status === "failed" && !item.forceSend) continue;

        /* Prevent double sending merit by checking log */
        if (checkDoubleSend(item.id) && !item.forceSend) {
          /* Flags the failed item in the queue instead of deleting it */
          updateQueueItem(item.id, (existing) => ({
            ...existing,
            status: "failed",
            error: "Merit already sent (detected in history).",
            attempts: (existing.attempts ?? 0) + 1,
          }));
          console.warn(
            `Merit for MsgID ${item.msgId} with amount ${item.amount} already exists in history, skipping...`,
          );
          continue;
        }

        if (item.attempts >= 2 && item.forceSend) {
          console.warn(
            `Merit for MsgID ${item.msgId} has failed ${item.attempts} times, removing from queue...`,
          );
          removeQueueItem(item.id);
          continue;
        }

        console.log(
          `Attempting to dispense ${item.amount} merit to MsgID ${item.msgId}...`,
        );

        if (item.forceSend) {
          console.warn(
            `Force sending enabled for MsgID ${item.msgId}, ignoring history log check.`,
          );
          item.forceSend = false;
          updateQueueItem(item.id, (existing) => ({
            ...existing,
            forceSend: false,
          }));
        }

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
              } else if (lowerHtml.includes("you can only send 50 merit ")) {
                const match = lowerHtml.match(
                  /you have already sent (\d+) merit to that user/i,
                );

                const sentMerit =
                  match && !Number.isNaN(Number.parseInt(match[1], 10))
                    ? Number.parseInt(match[1], 10)
                    : 0;
                errorMsg =
                  sentMerit >= 50
                    ? "You have already sent the maximum amount of merit to this user."
                    : sentMerit === 0
                      ? "You cant send merit to this user right now."
                      : `You can only send ${50 - sentMerit} merit to this user.`;
              } else if (lowerHtml.includes("you have already sent")) {
                errorMsg = "You have already sent merit to this user.";
              }

              /** Flags and update  the failed item in the queue instead of deleting it */
              updateQueueItem(item.id, (existing) => ({
                ...existing,
                attempts: (existing.attempts ?? 0) + 1,
                status: "failed",
                error: errorMsg,
              }));
            } else {
              removeQueueItem(item.id);
              const logs = GM_getValue("SUCCESS_LOGS", []);
              logs.push({ id: item.id, timestamp: Date.now() });
              GM_setValue("SUCCESS_LOGS", logs);
              console.log(
                `Successfully sent ${item.amount} merit for MsgID ${item.msgId}`,
              );
            }
          }
          await new Promise((res) => setTimeout(res, 1500)); // wait to prevent rate-limiting before next attempt
        } catch (err) {
          console.error(`Error dispensing merit for MsgID ${item.msgId}:`);
          throw new Error(
            `Error dispensing merit to ${item.msgId}, keeping in queue: ${err.message}`,
          );
        }
      }
    } catch (err) {
      console.error("Error in merit queue processing:", err);
    } finally {
      const failCount = GM_getValue("MERIT_QUEUE", []).filter(
        (item) => item.status === "failed",
      ).length;
      if (failCount > 0)
        alert(
          `Merit queue processing completed with ${failCount} failed item(s). Please review the queue for details.`,
        );
      else
        alert("Merit queue processing completed successfully with no errors.");
      releaseLock();
    }
  };
  /* End of main automation logic */

  /* Checks success log for a specific msgId and amount to prevent double sending */
  const checkDoubleSend = (currentId) => {
    const logs = GM_getValue("SUCCESS_LOGS", []);

    if (logs.length === 0) return false;

    const lifeSpan = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const freshLogs = logs.filter((l) => l.timestamp > lifeSpan);

    GM_setValue("SUCCESS_LOGS", freshLogs);
    console.log(
      freshLogs,
      freshLogs.length,
      "Fresh success logs after cleanup",
    );

    const logSet = new Set(freshLogs.map((l) => l.id));

    return logSet.has(currentId);
  };

  const updateQueueItem = (id, updater) => {
    const queue = GM_getValue("MERIT_QUEUE", []);
    const idx = queue.findIndex((x) => x.id === id);
    if (idx === -1) return;

    queue[idx] = updater(queue[idx]);
    GM_setValue("MERIT_QUEUE", queue);
    meritQueue = queue;
    renderQueue();
    const merit_stats = GM_getValue("MERIT_STATS", getMeritStats());
    updateMeritStatsDisplay(merit_stats);
  };

  const removeQueueItem = (id) => {
    const queue = GM_getValue("MERIT_QUEUE", []);

    const updated = queue.filter((item) => item.id !== id);

    GM_setValue("MERIT_QUEUE", updated);
    meritQueue = updated; // Update the in-memory queue as well
    renderQueue();
  };
  /* Locking mechanism to prevent multiple concurrent processes  */

  const isStale = (lock) =>
    !lock || Date.now() - lock.startedAt > LOCK_DURATION;

  const acquireLock = () => {
    const lock = GM_getValue(LOCK_KEY, null);

    if (lock && lock.active && !isStale(lock)) return false;

    GM_setValue(LOCK_KEY, {
      active: true,
      startedAt: Date.now(),
    });

    return true;
  };

  const releaseLock = () => GM_deleteValue(LOCK_KEY);

  /* End of locking mechanism implementation */

  const isPostEdit = !!document.querySelector('form[action*="sesc="]');

  const postForm =
    document.forms.postmodify ||
    document.querySelector('form[action*="action=post2"]');

  if (postForm && !isPostEdit) {
    postForm.addEventListener("submit", () => {
      GM_setValue("POST_ATTEMPT", Date.now());
    });
  }

  //array comparison helper function to check if two arrays are equal based on id, amount, and forceSend properties
  const arraysEqual = (a, b) => {
    if (a === null || b === null) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].id !== b[i].id || a[i].amount !== b[i].amount || a[i].forceSend !== b[i].forceSend) {
        return false;
      }
    }
  return true;
}

  /*=== sMerit stats === */
  const getMeritStats = async () => {
    try {
      const response = await fetch(
        "https://bitcointalk.org/index.php?action=merit",
      );
      if (!response.ok) throw new Error("Failed to fetch merit stats");

      const html = await response.text();

      const lowerHtml = html.toLowerCase();

      // console.log("merit stats raw html:", html);

      const sMeritMatch = lowerHtml.match(
        /you have\s*<b>(\d+)<\/b>\s*sendable merit/i,
      );

      const sourceMeritMatch = lowerHtml.match(
        /the next\s*<b>(\d+)<\/b>\s*merit you spend/,
      );

      const isMeritSource =
        lowerHtml.includes("you are a merit source") || !!sourceMeritMatch;

      const stats = {
        sMerit: Number(sMeritMatch?.[1] ?? 0),
        sourceMerit: Number(sourceMeritMatch?.[1] ?? 0),
        isMeritSource,
      };

      console.log("parsed merit stats:", stats);
      return stats;
    } catch (error) {
      console.error("Error fetching merit stats:", error);
      return null;
    }
  };

  const updateMeritStatsDisplay = async (stats) => {
    if (!stats) return;
    // const totalQueued = meritQueue.reduce(
    //   (sum, item) => sum + Number(item.amount),
    //   0,
    // );
    const totalQueued = meritQueue.reduce((sum, item) => {
      if (item.status === "failed" && !item.forceSend) return sum;
      return sum + Number(item.amount);
    }, 0);

    console.log("got here");
    const sourceUsed = Math.min(totalQueued, stats.sourceMerit);
    const personalUsed = Math.max(0, totalQueued - stats.sourceMerit);
    // console.log("su", sourceUsed, "pu", personalUsed);
    const remainingSourceSmerit = stats.sourceMerit - sourceUsed;
    const remainingSmerit = stats.sMerit - personalUsed;

    document.getElementById("mq-queued-smerit").textContent = totalQueued;
    document.getElementById("mq-remaining-smerit").textContent =
      remainingSmerit < 0
        ? `you need at least ${totalQueued - stats.sMerit} sMerit(s)`
        : remainingSmerit;

    document.getElementById("mq-remaining-source-smerit").textContent =
      remainingSourceSmerit;
  };

  const renderMeritStats = (stats) => {
    document.getElementById("mq-total-smerit").textContent = stats.sMerit;
    document.getElementById("mq-source-smerit").textContent = stats.sourceMerit;
    updateMeritStatsDisplay(stats);
  };

  const verifyAndUpdateMeritStats = () => {
    if (Date.now() - cachedMeritStatsAt > 60000 * 5) {
      getMeritStats().then((stats) => {
        if (!stats) return;
        const timeLog = Date.now();
        GM_setValue("MERIT_STATS", stats);
        GM_setValue("MERIT_STATS_TIME_LOG", timeLog);
        cachedMeritStats = stats;
        cachedMeritStatsAt = timeLog;
        renderMeritStats(stats);
      });
    } else {
      renderMeritStats(cachedMeritStats);
    }
  };
  //end of sMerit stats

  if (GM_getValue("POST_ATTEMPT")) {
    processMeritQueue();
  }

  //fetches and updates merit stats on page load after ten minutes if stats are not available in storage..
  if (!cachedMeritStats || Date.now() - cachedMeritStatsAt > 60000 * 10) {
    getMeritStats().then((stats) => {
      if (!stats) return;
      const timeLog = Date.now();
      GM_setValue("MERIT_STATS", stats);
      GM_setValue("MERIT_STATS_TIME_LOG", timeLog);
      cachedMeritStats = stats;
      cachedMeritStatsAt = timeLog;
    });
  }
})();
