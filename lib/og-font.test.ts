import { afterEach, describe, expect, it, vi } from "vitest";
import { bebasNeue, isTtfOrOtf } from "./og-font";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0]).buffer;
const TTF = bytes(0x00, 0x01, 0x00, 0x00);
const OTF = bytes(0x4f, 0x54, 0x54, 0x4f); // "OTTO"
const WOFF2 = bytes(0x77, 0x4f, 0x46, 0x32); // "wOF2"
const HTML = new TextEncoder().encode("<!DOCTYPE html>").buffer;

const CSS = "@font-face { src: url(https://fonts.gstatic.com/x.ttf) format('truetype'); }";

function mockFetch(font: ArrayBuffer, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("googleapis")
        ? { ok: true, text: async () => CSS }
        : { ok, arrayBuffer: async () => font },
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("isTtfOrOtf", () => {
  it("accepts TrueType and OpenType, rejects everything else", () => {
    expect(isTtfOrOtf(TTF)).toBe(true);
    expect(isTtfOrOtf(OTF)).toBe(true);
    expect(isTtfOrOtf(bytes(0x74, 0x72, 0x75, 0x65))).toBe(true); // "true"
    expect(isTtfOrOtf(WOFF2)).toBe(false);
    expect(isTtfOrOtf(HTML)).toBe(false);
    expect(isTtfOrOtf(new ArrayBuffer(2))).toBe(false);
  });
});

describe("bebasNeue", () => {
  it("returns the font when Google serves a real TTF", async () => {
    mockFetch(TTF);
    expect(await bebasNeue("BS.")).toBe(TTF);
  });

  it("falls back (null) on a non-font body, a failed download, or a network error", async () => {
    mockFetch(HTML);
    expect(await bebasNeue("BS.")).toBeNull();
    mockFetch(TTF, false);
    expect(await bebasNeue("BS.")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await bebasNeue("BS.")).toBeNull();
  });
});
