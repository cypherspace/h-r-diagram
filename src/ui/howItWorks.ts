// Modal explainer that walks students through the app's flow and
// defines key terms in plain English. Self-contained: appended to the
// document body when opened, removed when closed.

interface Section {
  heading: string;
  paragraphs: Array<string | Array<string>>; // strings or strong-then-rest pairs
}

const FLOW: Section = {
  heading: "How this app works",
  paragraphs: [
    "The Hertzsprung–Russell (H-R) diagram is the most famous chart in stellar astronomy. It plots stars by their temperature (across) and brightness (up the side). When you plot lots of stars on it, they fall into clear groups — and those groups tell us how stars work and how they age.",
    "This app lets you build your own H-R diagram from real stars.",
  ],
};

const STEPS: Section = {
  heading: "Step by step",
  paragraphs: [
    ["1. Find a part of the sky.", "Type a name (try \"M45\" — the Pleiades — or \"Sirius\") and press Go. You can also drag the sky to move it and scroll to zoom. The image is a real photograph of the night sky."],
    ["2. Search for stars.", "Press the Search button. The app looks up real stars that astronomers have catalogued in that part of the sky. They appear as little blue crosses."],
    ["3. Add stars to your chart.", "Click a single blue cross to add just that star, or hit Add all to add the whole bunch. You can also pick from the named star sets in the side panel (Sun-like, red dwarfs, white dwarfs, …) to plot a whole group at once."],
    ["4. Watch the patterns appear.", "Each dot is drawn in the colour the star really looks. As you add more stars, you'll see them fall into clear groups: a diagonal main sequence, red giants in the upper right, and tiny white dwarfs in the lower left."],
    ["5. Inspect any star.", "Click a dot on the chart to see that star's information, or click any marker on the sky map. The chart will highlight the star and the sky map will recentre on it."],
  ],
};

const TERMS: Section = {
  heading: "Words to know",
  paragraphs: [
    ["Star.", "A giant ball of mostly hydrogen gas, held together by its own gravity. Its core is so hot and dense that hydrogen fuses into helium, and the energy released is what makes it shine."],
    ["Spectral class.", "Letters that sort stars by surface temperature. From hottest to coolest: O, B, A, F, G, K, M. The Sun is a G-class star. Each letter is split further with a digit (the Sun is G2)."],
    ["Apparent magnitude.", "How bright a star looks from Earth. The scale runs backwards — a lower number means brighter. The brightest stars in the sky have negative magnitudes."],
    ["Absolute magnitude.", "How bright a star would look if every star in the universe were placed at the same standard distance (10 parsecs). This lets you compare two stars fairly, ignoring how far away they happen to be."],
    ["Light-year.", "The distance light travels in one year — about 9.5 trillion kilometres. The closest star besides the Sun is over 4 light-years away."],
    ["Parsec.", "Another distance unit astronomers use. 1 parsec ≈ 3.26 light-years."],
    ["Luminosity.", "The total energy a star gives off every second. We measure it as a multiple of the Sun's energy output. Some stars are millions of times brighter; others are thousands of times dimmer."],
    ["Temperature (Teff).", "How hot the surface of the star is, in kelvin. Cool red stars are around 3000 K (2700 °C); the Sun is about 5800 K (5500 °C); the hottest blue stars are over 30 000 K."],
    ["Main sequence.", "The big diagonal stripe on the H-R diagram, where most stars live for most of their lives. Hot, bright, blue stars are at the top-left; cool, faint, red stars are at the bottom-right."],
    ["Red giant.", "An old star that has run out of hydrogen in its core and swelled up to many times its original size. Cool but enormous, so still very bright."],
    ["White dwarf.", "What's left of a sun-like star after it dies — a hot, planet-sized leftover that gradually cools off over billions of years."],
  ],
};

const SECTIONS: Section[] = [FLOW, STEPS, TERMS];

export class HowItWorks {
  private overlay?: HTMLElement;
  private modal?: HTMLElement;
  private keyHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.close();
  };

  open(): void {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "how-overlay";
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.modal = document.createElement("div");
    this.modal.className = "how-modal";
    this.modal.setAttribute("role", "dialog");
    this.modal.setAttribute("aria-modal", "true");
    this.modal.setAttribute("aria-labelledby", "how-title");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "how-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => this.close());

    const title = document.createElement("h2");
    title.id = "how-title";
    title.textContent = SECTIONS[0].heading;

    this.modal.append(closeBtn, title);

    // First section is the intro; render its paragraphs without a heading.
    for (const p of SECTIONS[0].paragraphs) {
      this.modal.appendChild(paragraph(p));
    }

    for (const section of SECTIONS.slice(1)) {
      const h3 = document.createElement("h3");
      h3.textContent = section.heading;
      this.modal.appendChild(h3);
      for (const p of section.paragraphs) {
        this.modal.appendChild(paragraph(p));
      }
    }

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    window.addEventListener("keydown", this.keyHandler);

    // Focus the close button so Escape / Tab work immediately.
    closeBtn.focus({ preventScroll: true });
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = undefined;
    this.modal = undefined;
    window.removeEventListener("keydown", this.keyHandler);
  }
}

function paragraph(content: string | string[]): HTMLParagraphElement {
  const p = document.createElement("p");
  if (Array.isArray(content)) {
    const strong = document.createElement("strong");
    strong.textContent = content[0];
    p.append(strong, " ", content[1]);
  } else {
    p.textContent = content;
  }
  return p;
}
