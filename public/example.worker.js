// public/example.worker.js
console.log("[Worker] example.worker.js script loading.");

self.onmessage = function (event) {
  console.log("[Worker] Message received:", event.data);
  try {
    const messageData = event.data;
    let result;

    // Example: Handle messages structured as { type: 'CALCULATE', payload: number }
    if (
      messageData &&
      messageData.type === "CALCULATE" &&
      typeof messageData.payload === "number"
    ) {
      result = { type: "RESULT", payload: messageData.payload * 2 };
      console.log("[Worker] Calculation done, posting result:", result);
      self.postMessage(result);
    }
    // Example: Handle simple number data for basic calculation (as in original worker)
    else if (typeof messageData === "number") {
      result = messageData * 2;
      console.log("[Worker] Simple calculation done, posting result:", result);
      self.postMessage(result);
    }
    // Example: Echo message
    else if (messageData && messageData.type === "ECHO") {
      result = { type: "ECHO_BACK", payload: messageData.payload };
      console.log("[Worker] Echoing message, posting result:", result);
      self.postMessage(result);
    } else {
      console.warn(
        "[Worker] Unknown message format or type. Received:",
        messageData
      );
      self.postMessage({
        type: "ERROR",
        error: "Unknown message format",
        details: messageData,
      });
    }
  } catch (e) {
    console.error("[Worker] Error during message processing:", e);
    // Ensure e.message and e.stack are serializable
    const errorMessage = e instanceof Error ? e.message : String(e);
    const errorStack = e instanceof Error ? e.stack : undefined;
    self.postMessage({ type: "ERROR", error: errorMessage, stack: errorStack });
  }
};

self.onerror = function (errorEvent) {
  console.error(
    "[Worker] Uncaught error in worker:",
    errorEvent.message,
    errorEvent
  );
  // The main thread's worker.onerror should catch this.
  // To be absolutely sure the main thread gets an error object it can inspect:
  if (errorEvent instanceof ErrorEvent) {
    self.postMessage({
      type: "ERROR",
      error: errorEvent.message,
      filename: errorEvent.filename,
      lineno: errorEvent.lineno,
    });
  }
};

// Send a message when the worker is initialized and ready.
self.postMessage({
  type: "WORKER_READY",
  message: "Worker is initialized and ready.",
});
console.log(
  "[Worker] example.worker.js script loaded and event listeners attached. Sent WORKER_READY."
);
