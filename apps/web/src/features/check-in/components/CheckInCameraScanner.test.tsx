import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckInCameraScanner } from "./CheckInCameraScanner";

const { decode, decoderStop } = vi.hoisted(() => ({
  decode: vi.fn(),
  decoderStop: vi.fn(),
}));
vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromVideoElement = decode;
  },
}));
let media: ReturnType<typeof vi.fn>;
let trackStop: ReturnType<typeof vi.fn>;
let detect: ReturnType<typeof vi.fn>;
let play: ReturnType<typeof vi.spyOn>;
const onScan = vi.fn();
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  trackStop = vi.fn();
  media = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: media } });
  detect = vi.fn().mockResolvedValue([]);
  vi.stubGlobal(
    "BarcodeDetector",
    class {
      static getSupportedFormats = async () => ["qr_code"];
      detect = detect;
    }
  );
  play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
  vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(
    640
  );
  decode.mockResolvedValue({ stop: decoderStop });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function start() {
  fireEvent.click(screen.getByRole("button", { name: "Scan a pass" }));
  await settle();
}

describe("check-in camera", () => {
  it("attaches the stream to the mounted video before playing, then stops every track", async () => {
    let attached: unknown;
    play.mockImplementation(function (this: HTMLVideoElement) {
      attached = this.srcObject;
      return Promise.resolve();
    });
    const { container } = render(<CheckInCameraScanner onScan={onScan} />);
    await start();
    expect(attached).toEqual(await media.mock.results[0].value);
    expect(container.querySelector("video")).toHaveAttribute("playsinline");
    expect(media).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Turn Off Camera" }));
    expect(trackStop).toHaveBeenCalled();
    expect(container.querySelector("video")).toBeNull();
  });

  it("reports a native scan once and releases the camera", async () => {
    detect.mockResolvedValue([
      { rawValue: " ARY-TEST-PASS " },
      { rawValue: "ARY-TEST-PASS" },
    ]);
    render(<CheckInCameraScanner onScan={onScan} />);
    await start();
    expect(onScan).toHaveBeenCalledExactlyOnceWith("ARY-TEST-PASS");
    expect(trackStop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Scan a pass" })).toBeEnabled();
  });

  it("shows an actionable permission error and can be retried", async () => {
    media.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError")
    );
    render(<CheckInCameraScanner onScan={onScan} />);
    await start();
    expect(screen.getByRole("alert")).toHaveTextContent("Allow camera access");
    await start();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(media).toHaveBeenCalledTimes(2);
  });

  it.each(["stop", "unmount"])(
    "releases a late camera response after %s",
    async (action) => {
      let resolve!: (stream: unknown) => void;
      media.mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        })
      );
      const { unmount } = render(<CheckInCameraScanner onScan={onScan} />);
      await start();
      if (action === "unmount") unmount();
      else
        fireEvent.click(
          screen.getByRole("button", { name: "Turn Off Camera" })
        );
      await act(async () => {
        resolve({ getTracks: () => [{ stop: trackStop }] });
      });
      expect(trackStop).toHaveBeenCalled();
      expect(play).not.toHaveBeenCalled();
      expect(onScan).not.toHaveBeenCalled();
    }
  );

  it("stops the fallback decoder and ignores late results after closing", async () => {
    vi.stubGlobal("BarcodeDetector", undefined);
    const { container } = render(<CheckInCameraScanner onScan={onScan} />);
    await start();
    await waitFor(() => expect(decode).toHaveBeenCalled());
    expect(decode.mock.calls[0][0]).toBe(container.querySelector("video"));
    fireEvent.click(screen.getByRole("button", { name: "Turn Off Camera" }));
    expect(decoderStop).toHaveBeenCalled();
    act(() => decode.mock.calls[0][1]({ getText: () => "ARY-LATE-PASS" }));
    expect(onScan).not.toHaveBeenCalled();
  });

  it("uses the fallback when native QR support is unavailable", async () => {
    vi.stubGlobal(
      "BarcodeDetector",
      class {
        static getSupportedFormats = async () => ["code_128"];
      }
    );
    render(<CheckInCameraScanner onScan={onScan} />);
    await start();
    await waitFor(() => expect(decode).toHaveBeenCalled());
    act(() => decode.mock.calls[0][1]({ getText: () => "ARY-FALLBACK-PASS" }));
    expect(onScan).toHaveBeenCalledExactlyOnceWith("ARY-FALLBACK-PASS");
    expect(decoderStop).toHaveBeenCalled();
  });

  it("releases the camera when verification disables the scanner", async () => {
    const { rerender } = render(<CheckInCameraScanner onScan={onScan} />);
    await start();
    rerender(<CheckInCameraScanner onScan={onScan} disabled />);
    expect(trackStop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Scan a pass" })).toBeDisabled();
  });
});
