import { describe, expect, it } from "vitest";
import { toegangsmailHtml, toegangsmailTekst } from "./access-mail";

describe("toegangsmail in de vlootopmaak", () => {
  it("draagt het logo en zet de link geëscapet in een knop", () => {
    const html = toegangsmailHtml("https://spatiallab.atthis.ai/toegang?t=a&b=1");
    expect(html).toContain('src="https://atthis.ai/mail/spatiallab.png"');
    expect(html).toContain('href="https://spatiallab.atthis.ai/toegang?t=a&amp;b=1"');
    expect(html).toContain("Open SpatialLab");
  });

  it("maakt van een niet-http-link geen klikbare knop", () => {
    expect(toegangsmailHtml('javascript:alert(1)"><b>')).not.toContain("javascript:");
  });

  it("stuurt de kale link mee in de tekstversie", () => {
    expect(toegangsmailTekst("https://x.nl/t")).toContain("https://x.nl/t");
  });
});
