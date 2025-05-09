// src/App.tsx
import { useState } from "react";
import { useWebworker } from "./lib";
import type { WorkerStatus } from "./lib"; // Adjusted path to import from lib/index.ts
import "./App.css";

function App() {
  const [inputValue, setInputValue] = useState<number>(5);
  const { data, error, status, postMessage, terminateWorker } = useWebworker<
    number,
    number
  >(
    "/example.worker.js", // Path to your worker script in the public folder
    { timeout: 5000 } // Optional: 5 second timeout
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(Number(event.target.value));
  };

  const sendMessageToWorker = () => {
    if (status === "terminated") {
      alert("Worker has been terminated. Please refresh or re-initialize.");
      return;
    }
    console.log("Sending to worker:", inputValue);
    postMessage(inputValue);
  };

  const getStatusColor = (currentStatus: WorkerStatus) => {
    switch (currentStatus) {
      case "idle":
        return "grey";
      case "running":
        return "blue";
      case "success":
        return "green";
      case "error":
        return "red";
      case "terminated":
        return "orange";
      default:
        return "black";
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>React useWebworker Hook Example</h1>
        <div className="controls-container">
          <div className="input-group">
            <label htmlFor="inputValue">Send to Worker: </label>
            <input
              type="number"
              id="inputValue"
              value={inputValue}
              onChange={handleInputChange}
            />
          </div>
          <div className="button-group">
            <button
              onClick={sendMessageToWorker}
              disabled={status === "running" || status === "terminated"}
            >
              {status === "running" ? "Processing..." : "Send Message"}
            </button>
            <button
              onClick={terminateWorker}
              disabled={status === "terminated" || status === "idle"}
            >
              Terminate Worker
            </button>
          </div>
        </div>
        <div className="status-container">
          <p>
            Worker Status:{" "}
            <strong style={{ color: getStatusColor(status) }}>
              {status.toUpperCase()}
            </strong>
          </p>
          {status === "success" && (
            <p>
              Data from Worker: <strong>{JSON.stringify(data)}</strong>
            </p>
          )}
          {status === "error" && (
            <p>
              Error from Worker:{" "}
              <strong>
                {error instanceof ErrorEvent
                  ? error.message
                  : error instanceof Error
                  ? error.message
                  : JSON.stringify(error)}
              </strong>
            </p>
          )}
          {status === "terminated" && <p>Worker has been terminated.</p>}
        </div>
        <p className="info-text">
          The example worker (<code>public/example.worker.js</code>) simply
          multiplies the input by 2.
        </p>
      </header>
    </div>
  );
}

export default App;
