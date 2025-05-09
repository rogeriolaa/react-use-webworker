# useWebworker Hook

`useWebworker` is a React hook that simplifies the integration of Web Workers into your React applications. It allows you to offload computationally intensive tasks to a separate thread, preventing the main UI thread from becoming unresponsive.

## What are Web Workers?

Web Workers are a simple means for web content to run scripts in background threads. The worker thread can perform tasks without interfering with the user interface. Once created, a worker can send messages to the JavaScript code that created it by posting messages to an event handler specified by that code (and vice versa).

Web Workers are particularly useful for:

- **Performing CPU-intensive tasks:** Such as complex calculations, data processing, or image manipulation without freezing the main UI thread.
- **Keeping the UI responsive:** By offloading long-running tasks, the main thread remains free to handle user interactions, ensuring a smooth user experience.
- **Background data fetching and synchronization:** Workers can handle network requests and data synchronization in the background.

## Features

- Easy to use: Simple API for creating and interacting with Web Workers.
- Manages worker lifecycle: Handles worker creation, termination, and message passing.
- TypeScript support: Fully typed for a better development experience.

## Installation

```bash
npm install @n0n3br/use-webworker
# or
yarn add @n0n3br/use-webworker
```

## API

```typescript
function useWebworker<TData = any, TMessage = any>(
  workerFactory: () => Worker,
  onMessage?: (event: MessageEvent<TData>) => void,
  onError?: (event: ErrorEvent) => void
): {
  postMessage: (message: TMessage) => void;
  worker: Worker | null;
  isWorkerRunning: boolean;
  terminateWorker: () => void;
  error: ErrorEvent | null;
};
```

### Parameters

- `workerFactory`: A function that returns a new `Worker` instance, or a function whose body will be used as the Web Worker's code. If a function is provided to be the worker's code, it will be stringified and a new Worker will be created using a Blob URL. This function will be called to create the worker.
- `onMessage` (optional): A callback function that is invoked when the worker sends a message back to the main thread. It receives the `MessageEvent` as an argument.
- `onError` (optional): A callback function that is invoked when an error occurs in the worker. It receives the `ErrorEvent` as an argument.

### Return Value

An object containing:

- `postMessage`: A function to send messages to the Web Worker. It takes the message as an argument.
- `worker`: The `Worker` instance. It will be `null` until the worker is initialized.
- `isWorkerRunning`: A boolean indicating whether the worker is currently running.
- `terminateWorker`: A function to terminate the Web Worker.
- `error`: The last error event received from the worker, or `null` if no error has occurred.

## Usage Example

First, create your worker file (e.g., `my.worker.js`):

```javascript
// my.worker.js
self.onmessage = function (event) {
  const data = event.data;
  // Perform some heavy computation
  const result = data * 2;
  self.postMessage(result);
};
```

Then, use the `useWebworker` hook in your React component:

```tsx
import React, { useState, useCallback } from "react";
import { useWebworker } from "@n0n3br/use-webworker";

const MyComponent: React.FC = () => {
  const [result, setResult] = useState<number | null>(null);

  const handleMessage = useCallback((event: MessageEvent<number>) => {
    setResult(event.data);
  }, []);

  const handleError = useCallback((event: ErrorEvent) => {
    console.error("Worker error:", event.message);
  }, []);

  const workerFactory = () =>
    new Worker(new URL("./my.worker.js", import.meta.url));

  const { postMessage, isWorkerRunning, terminateWorker, error } = useWebworker<
    number,
    number
  >(workerFactory, handleMessage, handleError);

  const handleClick = () => {
    if (isWorkerRunning) {
      postMessage(5); // Send a message to the worker
    }
  };

  return (
    <div>
      <h1>useWebworker Example</h1>
      <button onClick={handleClick} disabled={!isWorkerRunning}>
        Calculate (5 * 2)
      </button>
      {result !== null && <p>Result from worker: {result}</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      {isWorkerRunning && (
        <button onClick={terminateWorker} style={{ marginLeft: "10px" }}>
          Terminate Worker
        </button>
      )}
    </div>
  );
};

export default MyComponent;
```

### Using a function as the worker source

You can also provide a function directly to `useWebworker`. The body of this function will be executed in the Web Worker.

```tsx
import React, { useState, useCallback } from "react";
import { useWebworker } from "@n0n3br/use-webworker";

const MyComponentWithFunctionWorker: React.FC = () => {
  const [result, setResult] = useState<number | null>(null);

  const handleMessage = useCallback((event: MessageEvent<number>) => {
    setResult(event.data);
  }, []);

  const handleError = useCallback((event: ErrorEvent) => {
    console.error("Worker error:", event.message);
  }, []);

  // Define the worker logic as a function
  const workerFunction = () => {
    self.onmessage = (event: MessageEvent<number>) => {
      const data = event.data;
      // Perform some heavy computation
      const result = data * 3; // Example: multiply by 3
      self.postMessage(result);
    };
  };

  const { postMessage, isWorkerRunning, terminateWorker, error } = useWebworker<
    number,
    number
  >(workerFunction, handleMessage, handleError);

  const handleClick = () => {
    if (isWorkerRunning) {
      postMessage(10); // Send a message to the worker (10 * 3)
    }
  };

  return (
    <div>
      <h1>useWebworker Example (Function as Worker)</h1>
      <button onClick={handleClick} disabled={!isWorkerRunning}>
        Calculate (10 * 3)
      </button>
      {result !== null && <p>Result from worker: {result}</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      {isWorkerRunning && (
        <button onClick={terminateWorker} style={{ marginLeft: "10px" }}>
          Terminate Worker
        </button>
      )}
    </div>
  );
};

export default MyComponentWithFunctionWorker;
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you find any bugs or have suggestions for improvements.

### Development Setup

1. Clone the repository.
2. Install dependencies: `npm install` or `yarn install`.
3. Run tests: `npm test` or `yarn test`.
4. Build the library: `npm run build` or `yarn build`.

## Reporting Issues

If you encounter any issues, please report them on the [GitHub Issues](https://github.com/rogeriolaa/react-use-webworker/issues) page. Provide as much detail as possible, including steps to reproduce the issue.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
