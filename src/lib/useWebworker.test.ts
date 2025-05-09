// src/lib/useWebworker.test.ts
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useWebworker } from "./useWebworker";

// Mock Worker
class MockWorker {
  url: string | URL;
  onmessage: (event: any) => void = () => {};
  onerror: (event: any) => void = () => {};
  postMessageFn: (data: any) => void;
  terminateFn: () => void;

  constructor(scriptURL: string | URL) {
    this.url = scriptURL;
    this.postMessageFn = vi.fn();
    this.terminateFn = vi.fn();
  }

  postMessage(data: any) {
    this.postMessageFn(data);
  }

  terminate() {
    this.terminateFn();
  }

  // Simulate receiving a message from the worker
  simulateMessage(data: any) {
    this.onmessage({ data });
  }

  // Simulate an error from the worker
  simulateError(error: any) {
    this.onerror(error);
  }
}

global.Worker = MockWorker as any;

const MOCK_WORKER_URL = "/example.worker.js";

describe("useWebworker", () => {
  let mockWorkerInstance: MockWorker | null = null;

  beforeEach(() => {
    // Ensure a new worker instance is created for each test by resetting the Worker mock behavior
    vi.spyOn(global, "Worker").mockImplementation((url: string | URL) => {
      mockWorkerInstance = new MockWorker(url);
      return mockWorkerInstance as any;
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
    mockWorkerInstance = null;
  });

  it("should initialize with running status and null data/error when workerUrl is provided", () => {
    const { result } = renderHook(() => useWebworker(MOCK_WORKER_URL));
    expect(result.current.status).toBe("running"); // useEffect runs, worker is created
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should change status to running when worker is initialized", () => {
    const { result } = renderHook(() => useWebworker(MOCK_WORKER_URL));
    // useEffect runs, worker is created
    expect(result.current.status).toBe("running");
    expect(mockWorkerInstance).not.toBeNull();
  });

  it("should post a message to the worker and receive data", () => {
    const { result } = renderHook(() => useWebworker(MOCK_WORKER_URL));
    const testMessage = { type: "TEST", payload: 42 };
    const expectedResponse = { result: 84 };

    act(() => {
      result.current.postMessage(testMessage);
    });

    expect(mockWorkerInstance?.postMessageFn).toHaveBeenCalledWith(testMessage);

    act(() => {
      mockWorkerInstance?.simulateMessage(expectedResponse);
    });

    expect(result.current.data).toEqual(expectedResponse);
    expect(result.current.status).toBe("success");
    expect(result.current.error).toBeNull();
  });

  it("should handle worker errors", () => {
    const { result } = renderHook(() => useWebworker(MOCK_WORKER_URL));
    const testError = new ErrorEvent("WorkerError", {
      message: "Something went wrong",
    });

    act(() => {
      mockWorkerInstance?.simulateError(testError);
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.status).toBe("error");
    expect(result.current.data).toBeNull();
  });

  it("should terminate the worker", () => {
    const { result, unmount } = renderHook(() => useWebworker(MOCK_WORKER_URL));

    act(() => {
      result.current.terminateWorker();
    });

    expect(mockWorkerInstance?.terminateFn).toHaveBeenCalled();
    expect(result.current.status).toBe("terminated");
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Test that postMessage does nothing after termination
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    act(() => {
      result.current.postMessage({ type: "AFTER_TERMINATE" });
    });
    expect(mockWorkerInstance?.postMessageFn).not.toHaveBeenCalledWith({
      type: "AFTER_TERMINATE",
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Worker is not running or has been terminated."
    );
    expect(result.current.status).toBe("error"); // Status changes to error on postMessage after termination
    expect(result.current.error).toBeInstanceOf(Error);
    consoleWarnSpy.mockRestore();

    unmount(); // Should also terminate on unmount
    expect(mockWorkerInstance?.terminateFn).toHaveBeenCalledTimes(1); // Already called by terminateWorker
  });

  it("should terminate the worker on unmount", () => {
    const { unmount } = renderHook(() => useWebworker(MOCK_WORKER_URL));
    expect(mockWorkerInstance?.terminateFn).not.toHaveBeenCalled();
    unmount();
    expect(mockWorkerInstance?.terminateFn).toHaveBeenCalled();
  });

  it("should handle worker timeout", () => {
    const timeoutDuration = 100;
    const { result } = renderHook(() =>
      useWebworker(MOCK_WORKER_URL, { timeout: timeoutDuration })
    );

    expect(result.current.status).toBe("running");

    act(() => {
      vi.advanceTimersByTime(timeoutDuration + 50);
    });

    expect(mockWorkerInstance?.terminateFn).toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.error).toEqual(new Error("Worker timed out"));
    expect(result.current.data).toBeNull();
  });

  it("should not timeout if worker responds before timeout", () => {
    const timeoutDuration = 100;
    const { result } = renderHook(() =>
      useWebworker(MOCK_WORKER_URL, { timeout: timeoutDuration })
    );
    const responseData = { message: "done" };

    act(() => {
      vi.advanceTimersByTime(timeoutDuration - 50);
    });

    act(() => {
      mockWorkerInstance?.simulateMessage(responseData);
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(responseData);

    act(() => {
      vi.advanceTimersByTime(timeoutDuration + 50); // Advance past original timeout
    });

    expect(mockWorkerInstance?.terminateFn).not.toHaveBeenCalled();
    expect(result.current.status).toBe("success"); // Should remain success
    expect(result.current.error).toBeNull();
  });

  it("should not timeout if worker errors before timeout", () => {
    const timeoutDuration = 100;
    const { result } = renderHook(() =>
      useWebworker(MOCK_WORKER_URL, { timeout: timeoutDuration })
    );
    const testError = new ErrorEvent("WorkerError");

    act(() => {
      vi.advanceTimersByTime(timeoutDuration - 50);
    });

    act(() => {
      mockWorkerInstance?.simulateError(testError);
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toEqual(testError);

    act(() => {
      vi.advanceTimersByTime(timeoutDuration + 50); // Advance past original timeout
    });

    expect(mockWorkerInstance?.terminateFn).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error"); // Should remain error
  });

  it("should clear timeout when worker is terminated manually", () => {
    const timeoutDuration = 100;
    const { result } = renderHook(() =>
      useWebworker(MOCK_WORKER_URL, { timeout: timeoutDuration })
    );

    act(() => {
      result.current.terminateWorker();
    });

    act(() => {
      vi.advanceTimersByTime(timeoutDuration + 50);
    });

    expect(result.current.status).toBe("terminated");
    expect(result.current.error).toBeNull(); // No timeout error
  });

  it("should handle creation error if Worker constructor throws", () => {
    vi.spyOn(global, "Worker").mockImplementation(() => {
      throw new Error("Failed to create worker");
    });

    const { result } = renderHook(() => useWebworker(MOCK_WORKER_URL));

    expect(result.current.status).toBe("error");
    expect(result.current.error).toEqual(new Error("Failed to create worker"));
    expect(result.current.data).toBeNull();
  });

  it("should not create a worker if workerUrl is not provided initially and then provided", () => {
    const { result, rerender } = renderHook(({ url }) => useWebworker(url), {
      initialProps: { url: "" },
    });

    expect(result.current.status).toBe("idle");
    expect(mockWorkerInstance).toBeNull();

    rerender({ url: MOCK_WORKER_URL });

    expect(result.current.status).toBe("running");
    expect(mockWorkerInstance).not.toBeNull();
  });

  it("should re-initialize worker if workerUrl changes", () => {
    const { result, rerender } = renderHook(({ url }) => useWebworker(url), {
      initialProps: { url: MOCK_WORKER_URL },
    });

    const firstWorkerInstance = mockWorkerInstance;
    expect(result.current.status).toBe("running");
    expect(firstWorkerInstance).not.toBeNull();
    const terminateSpyFirst = vi.spyOn(firstWorkerInstance!, "terminate");

    const NEW_WORKER_URL = "/new.worker.js";
    rerender({ url: NEW_WORKER_URL });

    expect(terminateSpyFirst).toHaveBeenCalled();
    expect(result.current.status).toBe("running");
    expect(mockWorkerInstance).not.toBeNull();
    expect(mockWorkerInstance?.url).toBe(NEW_WORKER_URL);
    expect(mockWorkerInstance).not.toBe(firstWorkerInstance);
  });

  it("should not post message if worker is not initialized (no URL)", () => {
    const { result } = renderHook(() => useWebworker(""));
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    act(() => {
      result.current.postMessage({ type: "TEST" });
    });

    expect(result.current.status).toBe("error"); // Status changes to error
    expect(result.current.error).toBeInstanceOf(Error);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Worker is not running or has been terminated."
    );
    consoleWarnSpy.mockRestore();
  });

  // Test suite for worker function as source
  describe("useWebworker with worker function", () => {
    let mockWorkerInstance: MockWorker | null = null;

    // A simple worker function for testing
    const createMockWorker = () => {
      const workerContent = `
        self.onmessage = function(e) {
          if (e.data.type === 'ECHO') {
            self.postMessage({ type: 'ECHO_BACK', payload: e.data.payload });
          } else if (e.data.type === 'CALCULATE') {
            self.postMessage({ result: e.data.payload * 2 });
          }
        };
      `;
      const blob = new Blob([workerContent], {
        type: "application/javascript",
      });
      const url = URL.createObjectURL(blob);
      mockWorkerInstance = new MockWorker(url); // Use the same MockWorker for consistency in spying
      // We need to return a real Worker instance or something that behaves like it for the hook
      // For testing purposes, we can return the mockWorkerInstance directly if it's compatible
      // or wrap it if necessary. Given MockWorker is used in other tests, it should be fine.
      return mockWorkerInstance as any;
    };

    beforeEach(() => {
      // Ensure URL.createObjectURL and URL.revokeObjectURL exist in the JSDOM environment
      if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = vi.fn(() => "mock-blob-url-initial");
      }
      if (!global.URL.revokeObjectURL) {
        global.URL.revokeObjectURL = vi.fn();
      }

      // Spy on URL.createObjectURL to ensure it's called
      vi.spyOn(URL, "createObjectURL").mockImplementation(
        (obj: Blob | MediaSource) =>
          obj instanceof Blob ? `blob:${obj.size}` : "blob:media-source" // Return a string that looks like a blob URL
      );
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
      // The Worker constructor will be called by the createMockWorker function
      // We don't need to mock global.Worker here as the function itself creates the worker.
      // However, our MockWorker is assigned to mockWorkerInstance inside createMockWorker.
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.clearAllTimers();
      mockWorkerInstance = null;
    });

    it("should initialize with running status when workerSource is a function", () => {
      const { result } = renderHook(() => useWebworker(createMockWorker));
      expect(result.current.status).toBe("running");
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockWorkerInstance).not.toBeNull(); // Check if the mock worker was created
    });

    it("should post a message to the worker and receive data when workerSource is a function", () => {
      const { result } = renderHook(() => useWebworker(createMockWorker));
      const testMessage = { type: "CALCULATE", payload: 21 };
      const expectedResponse = { result: 42 };

      act(() => {
        result.current.postMessage(testMessage);
      });

      // Ensure postMessage on the *actual* worker instance (mocked by MockWorker) was called
      expect(mockWorkerInstance?.postMessageFn).toHaveBeenCalledWith(
        testMessage
      );

      act(() => {
        mockWorkerInstance?.simulateMessage(expectedResponse);
      });

      expect(result.current.data).toEqual(expectedResponse);
      expect(result.current.status).toBe("success");
      expect(result.current.error).toBeNull();
    });

    it("should handle worker errors when workerSource is a function", () => {
      const { result } = renderHook(() => useWebworker(createMockWorker));
      const testError = new ErrorEvent("WorkerFnError", {
        message: "Something went wrong in function worker",
      });

      act(() => {
        mockWorkerInstance?.simulateError(testError);
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.status).toBe("error");
      expect(result.current.data).toBeNull();
    });

    it("should terminate the worker when workerSource is a function", () => {
      const { result, unmount } = renderHook(() =>
        useWebworker(createMockWorker)
      );

      act(() => {
        result.current.terminateWorker();
      });

      expect(mockWorkerInstance?.terminateFn).toHaveBeenCalled();
      expect(result.current.status).toBe("terminated");
    });

    it("should terminate the worker on unmount when workerSource is a function", () => {
      const { unmount } = renderHook(() => useWebworker(createMockWorker));
      expect(mockWorkerInstance?.terminateFn).not.toHaveBeenCalled();
      unmount();
      expect(mockWorkerInstance?.terminateFn).toHaveBeenCalled();
    });

    it("should handle worker timeout when workerSource is a function", () => {
      const timeoutDuration = 100;
      const { result } = renderHook(() =>
        useWebworker(createMockWorker, { timeout: timeoutDuration })
      );

      expect(result.current.status).toBe("running");

      act(() => {
        vi.advanceTimersByTime(timeoutDuration + 50);
      });

      expect(mockWorkerInstance?.terminateFn).toHaveBeenCalled();
      expect(result.current.status).toBe("error");
      expect(result.current.error).toEqual(new Error("Worker timed out"));
    });
  });
});
