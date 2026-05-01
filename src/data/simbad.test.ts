import { describe, expect, it } from "vitest";
import { prettify } from "./simbad";

describe("prettify SIMBAD main identifiers", () => {
  it("converts a Bayer designation to Greek letter form", () => {
    expect(prettify("* zet Ori A")).toBe("ζ Ori A");
    expect(prettify("* alf CMa")).toBe("α CMa");
    expect(prettify("* del Cru")).toBe("δ Cru");
  });

  it("preserves Bayer subscripts as superscript digits", () => {
    expect(prettify("* mu1 Sco")).toBe("μ¹ Sco");
    expect(prettify("* zet2 Ret")).toBe("ζ² Ret");
  });

  it("strips leading NAME prefix", () => {
    expect(prettify("NAME Alnitak")).toBe("Alnitak");
    expect(prettify("NAME Sirius")).toBe("Sirius");
  });

  it("strips binary/variable prefixes", () => {
    expect(prettify("** STT 412")).toBe("STT 412");
    expect(prettify("V* TX Cam")).toBe("TX Cam");
  });

  it("leaves catalog identifiers alone", () => {
    expect(prettify("HD 48915")).toBe("HD 48915");
    expect(prettify("HIP 26727")).toBe("HIP 26727");
  });
});
