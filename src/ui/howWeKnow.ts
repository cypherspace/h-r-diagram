// "How we know" panel — explains how each quantity displayed in the
// data panel is actually calculated, at A-level (16-18) physics depth.
// Self-contained modal mirroring HowItWorks, but each subtopic is
// rendered as a <details> dropdown so students can expand only the bit
// they care about.

interface Subsection {
  title: string;
  bodyHtml: string;
}

const SUBSECTIONS: Subsection[] = [
  {
    title: "Distance — parallax",
    bodyHtml: `
      <p>Hold a finger up at arm's length and look at it with your left
      eye, then your right. The finger seems to jump against the
      background. The closer the finger, the bigger the jump.
      Astronomers do the same thing using the Earth's orbit as their two
      "eyes": they photograph a star in January and again in July (the
      Earth has moved 300 million km), and measure how far the star has
      shifted against more distant stars in the background.</p>
      <p>The half-angle of that shift is called the
      <strong>parallax angle</strong>, written <em>p</em>. The parallax
      angle is tiny — less than one arcsecond (1/3600 of a degree).</p>
      ${parallaxSvg()}
      <p>The distance to the star is then</p>
      <blockquote class="hwk-eq"><strong>d (parsecs) = 1 / p (arcseconds)</strong></blockquote>
      <p>A parsec ("<strong>par</strong>allax-arc<strong>sec</strong>ond")
      is defined this way: if an object has a parallax of 1 arcsecond,
      it is 1 parsec away (≈ 3.26 light-years). Halve the parallax →
      double the distance.</p>
      <p>Gaia measures parallaxes for nearly <em>two billion stars</em>
      to better than a milliarcsecond — accurate enough to map the
      structure of the Galaxy.</p>
    `,
  },
  {
    title: "Apparent brightness — magnitudes",
    bodyHtml: `
      <p>"Apparent brightness" is just how bright the star looks from
      Earth. We measure it on the <strong>magnitude scale</strong>, a
      system Hipparchus invented over 2000 years ago. He categorised
      the brightest stars he could see as 1, and the dimmest stars he
      could see as a 6. That scale is still the basis for how we talk
      about the brightness of stars.</p>
      <p>Two quirks worth knowing:</p>
      <ol>
        <li><strong>Lower numbers mean brighter stars.</strong> Sirius
        is magnitude −1.46; the faintest stars you can see from a dark
        site are around magnitude 6. The Sun is magnitude −26.7. Yes,
        negative.</li>
        <li><strong>It's logarithmic.</strong> A difference of 5
        magnitudes is exactly a factor of 100 in brightness. So 1
        magnitude is 100<sup>1/5</sup> ≈ 2.512 times.</li>
      </ol>
      <p>Mathematically:</p>
      <blockquote class="hwk-eq"><strong>m₁ − m₂ = −2.5 log₁₀(F₁ / F₂)</strong></blockquote>
      <p>where <em>F</em> is the flux (energy arriving at Earth per
      square metre per second).</p>
      <p>Gaia measures apparent brightness in three bands because stars
      give out lots of light that isn't visible — ultra-violet and
      infra-red, for example. We use <em>G</em> (a broad "white-light"
      measurement) and treat it as the visual magnitude
      <em>m<sub>V</sub></em>.</p>
    `,
  },
  {
    title: "Absolute magnitude — distance modulus",
    bodyHtml: `
      <p>Apparent brightness is unfair: a faint dim star nearby looks
      the same as a luminous star far away. To compare stars properly
      we ask: <em>how bright would this star look if it were 10 parsecs
      away?</em> That's the <strong>absolute magnitude</strong>,
      <em>M</em>.</p>
      <p>Light obeys the <strong>inverse-square law</strong> — moving
      twice as far away makes a star four times fainter. Convert to
      magnitudes (factor of 4 → 1.505 mag) and you get the
      <strong>distance modulus</strong>:</p>
      <blockquote class="hwk-eq"><strong>M = m − 5 log₁₀(d / 10 pc)</strong></blockquote>
      <p>Once we know <em>m</em> (Gaia measures it) and <em>d</em>
      (from parallax), <em>M</em> can be calculated. The Sun's absolute
      magnitude is +4.83 — a fairly ordinary G-type star, no longer
      burningly bright, if we were 10 parsecs away.</p>
    `,
  },
  {
    title: "Temperature — colour and Wien's law",
    bodyHtml: `
      <p>Hot objects glow blue, cool objects glow red. A blacksmith's
      iron goes from dull red (~700 °C) through orange and yellow to
      white-hot (~1300 °C). The same physics works for stars, and it's
      described by <strong>Wien's displacement law</strong>.</p>
      <p>Quantitatively, this law says the wavelength at which a hot
      body radiates most strongly, λ<sub>max</sub>, is inversely
      proportional to its temperature:</p>
      <blockquote class="hwk-eq"><strong>λ<sub>max</sub> = b / T</strong>, where b ≈ 2.898 × 10⁻³ m·K</blockquote>
      ${blackbodyCurvesSvg()}
      ${realSpectrumSvg()}
      <p>We don't measure λ<sub>max</sub> directly. Instead Gaia
      measures brightness through two coloured filters,
      <strong>BP</strong> (blue-photometer, ~330–680 nm) and
      <strong>RP</strong> (red-photometer, ~640–1050 nm), and we use
      the difference:</p>
      <blockquote class="hwk-eq"><strong>BP − RP = m<sub>BP</sub> − m<sub>RP</sub></strong>     (the "colour index")</blockquote>
      <p>A hot star is bright in BP and faint in RP, so BP−RP is small
      (or negative). A cool star is the opposite. A formula calibrated
      against well-studied stars (Ballesteros 2012) converts colour to
      temperature.</p>
      <p>For most stars, Gaia has already done this calculation and
      published a Teff (effective temperature, T<sub>eff</sub>, the
      estimated temperature of the surface of the star) in its
      astrophysical-parameters table — when available, we use that
      directly.</p>
    `,
  },
  {
    title: "Luminosity — Stefan-Boltzmann and bolometric correction",
    bodyHtml: `
      <p><strong>Luminosity</strong> is a star's total power output —
      energy radiated per second, in watts, summed over every
      wavelength. The Sun's luminosity is 3.83 × 10²⁶ W; we usually
      express other stars as multiples of the Sun's value.</p>
      <p>We can find the luminosity in two ways.</p>
      <p><strong>First, we can use the Stefan-Boltzmann law, which
      describes how much energy a hot object radiates.</strong> A
      blackbody of radius <em>R</em> and temperature <em>T</em>
      radiates</p>
      <blockquote class="hwk-eq"><strong>L = 4π R² σ T⁴</strong>, where σ = 5.67 × 10⁻⁸ W·m⁻²·K⁻⁴</blockquote>
      <p>So a star twice as big as the Sun at the same temperature is
      4× more luminous; a star at twice the temperature is 16× more
      luminous. This is why blue supergiants are millions of times
      brighter than the Sun: they are both many times bigger AND much
      hotter.</p>
      <p>However, we can't measure this. We can only measure how much
      power gets to Earth.</p>
      <p><strong>Second, from magnitudes.</strong> Absolute magnitude
      <em>M</em> tells us how much light we'd see <em>in a particular
      filter</em> (V, the visual band). For very cool stars most of
      the energy goes off in the infrared, so it doesn't get included
      in V, and for very hot stars it spills into ultraviolet. We add
      a small correction called the
      <strong>bolometric correction</strong> <em>BC(T)</em>, which has
      been determined from real star spectra previously:</p>
      <blockquote class="hwk-eq"><strong>M<sub>bol</sub> = M<sub>V</sub> + BC(T)</strong></blockquote>
      <p>Then we just compare the magnitude to the Sun.</p>
      <blockquote class="hwk-eq"><strong>L / L<sub>☉</sub> = 10<sup>(M<sub>bol,☉</sub> − M<sub>bol</sub>) / 2.5</sup></strong>, where M<sub>bol,☉</sub> = 4.74</blockquote>
      <p>The Gaia survey has already calculated the luminosity of many
      stars using this calculation — we use this when it's there.</p>
    `,
  },
  {
    title: "Spectral class — OBAFGKM",
    bodyHtml: `
      <p>Long before anyone knew stars were balls of hydrogen plasma,
      astronomers split a star's light into its rainbow spectrum and
      noticed dark <strong>absorption lines</strong> at characteristic
      wavelengths. Different stars showed different patterns. They
      sorted them into letters; the letters were alphabetical,
      originally, and were based on what we could see in a star's
      composition (what it's made of) — but then scientists realised
      you could order all stars by temperature instead, and you didn't
      need all the letters to be able to categorise all stars. So we
      were left with this scale:</p>
      <table class="hwk-table">
        <thead>
          <tr><th>Class</th><th>Temperature</th><th>Colour</th><th>Example</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>O</strong></td><td>≥ 30 000 K</td><td>blue</td><td>Mintaka</td></tr>
          <tr><td><strong>B</strong></td><td>10 000–30 000 K</td><td>blue-white</td><td>Rigel</td></tr>
          <tr><td><strong>A</strong></td><td>7 500–10 000 K</td><td>white</td><td>Sirius</td></tr>
          <tr><td><strong>F</strong></td><td>6 000–7 500 K</td><td>yellow-white</td><td>Procyon</td></tr>
          <tr><td><strong>G</strong></td><td>5 200–6 000 K</td><td>yellow</td><td>Sun</td></tr>
          <tr><td><strong>K</strong></td><td>3 700–5 200 K</td><td>orange</td><td>Aldebaran</td></tr>
          <tr><td><strong>M</strong></td><td>2 400–3 700 K</td><td>red</td><td>Betelgeuse, Proxima</td></tr>
        </tbody>
      </table>
      <p>Each letter has a digit 0–9 (hottest to coolest within the
      class), and a Roman numeral for <strong>luminosity class</strong>.
      Some examples are I = supergiant, III = giant, V = main sequence,
      "D" = white dwarf (although astronomers use slightly different
      terminology). The Sun is <strong>G2V</strong> — a main-sequence
      star slightly hotter than mid-G.</p>
      <p>This app looks at over 2 billion stars. Most of these stars
      haven't been formally classified yet. So if you do look at an
      unknown star (and you probably will!), we have to estimate the
      classification.</p>
    `,
  },
];

export class HowWeKnow {
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
    this.modal.setAttribute("aria-labelledby", "hwk-title");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "how-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => this.close());

    const title = document.createElement("h2");
    title.id = "hwk-title";
    title.textContent = "How we know";

    const intro = document.createElement("p");
    intro.append(
      "Each piece of data shown for a star — its distance, brightness, " +
        "temperature, luminosity, classification — is calculated from raw " +
        "measurements of the light it gives out. The measurements we use " +
        "were made by a European Space Agency spacecraft called Gaia. You " +
        "can ",
    );
    const gaiaLink = document.createElement("a");
    gaiaLink.href =
      "https://www.esa.int/Science_Exploration/Space_Science/Gaia/Gaia_overview";
    gaiaLink.target = "_blank";
    gaiaLink.rel = "noopener noreferrer";
    gaiaLink.textContent = "click here";
    intro.appendChild(gaiaLink);
    intro.append(
      " to learn more about the spacecraft and the data; or click a topic " +
        "to see how we use the data from Gaia.",
    );

    this.modal.append(closeBtn, title, intro);

    for (const sub of SUBSECTIONS) {
      const details = document.createElement("details");
      details.className = "hwk-section";
      const summary = document.createElement("summary");
      summary.textContent = sub.title;
      details.appendChild(summary);
      const body = document.createElement("div");
      body.className = "hwk-body";
      body.innerHTML = sub.bodyHtml;
      details.appendChild(body);
      this.modal.appendChild(details);
    }

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    window.addEventListener("keydown", this.keyHandler);

    closeBtn.focus({ preventScroll: true });
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = undefined;
    this.modal = undefined;
    window.removeEventListener("keydown", this.keyHandler);
  }
}

// ---- inline SVG diagrams ----

function parallaxSvg(): string {
  return `<figure class="hwk-fig"><svg viewBox="0 0 360 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Parallax diagram">
    <!-- background stars -->
    <g fill="#7c8db5">
      <circle cx="320" cy="35" r="1.2"/>
      <circle cx="305" cy="80" r="1"/>
      <circle cx="335" cy="120" r="1.4"/>
      <circle cx="315" cy="160" r="1"/>
      <circle cx="345" cy="195" r="1.2"/>
    </g>
    <!-- nearby star -->
    <circle cx="300" cy="110" r="4.5" fill="#ffd97a"/>
    <text x="295" y="100" text-anchor="end" fill="#ffd97a" font-size="11">nearby star</text>
    <!-- Sun -->
    <circle cx="80" cy="110" r="6" fill="#ffb84a"/>
    <text x="65" y="135" fill="#ffb84a" font-size="11">Sun</text>
    <!-- Earth orbit -->
    <ellipse cx="80" cy="110" rx="50" ry="50" fill="none" stroke="#465879" stroke-width="0.7" stroke-dasharray="2,3"/>
    <!-- Earth in Jan & Jul -->
    <circle cx="80" cy="60" r="3.5" fill="#5aa9ff"/>
    <text x="80" y="50" text-anchor="middle" fill="#5aa9ff" font-size="10">January</text>
    <circle cx="80" cy="160" r="3.5" fill="#5aa9ff"/>
    <text x="80" y="180" text-anchor="middle" fill="#5aa9ff" font-size="10">July</text>
    <!-- Lines of sight -->
    <line x1="80" y1="60" x2="300" y2="110" stroke="#9be7c4" stroke-width="1"/>
    <line x1="80" y1="160" x2="300" y2="110" stroke="#9be7c4" stroke-width="1"/>
    <!-- Parallax angle arc -->
    <path d="M 270 100 A 30 30 0 0 1 270 120" fill="none" stroke="#ffd97a" stroke-width="1.2"/>
    <text x="240" y="115" fill="#ffd97a" font-size="11" font-style="italic">2p</text>
  </svg><figcaption>The Earth's two opposite positions (six months apart) give astronomers a baseline of 300 million km. The angle 2p is tiny — Gaia measures it to a millionth of a degree.</figcaption></figure>`;
}

function blackbodyCurvesSvg(): string {
  // Five Planck curves at 3000 / 4000 / 5000 / 6000 / 7000 K, drawn
  // Hyperphysics-style, plus a red dashed line tracing the peak
  // position (Wien's law) across temperature so the shift is visually
  // obvious. All curves share the same y-axis (relative to the
  // hottest peak) so students see both effects at once: hotter stars
  // peak at shorter wavelengths AND emit far more total energy.
  const curves: Array<{ T: number; color: string; label: string }> = [
    { T: 3000, color: "#ff6b6b", label: "3000 K" },
    { T: 4000, color: "#ff9a3a", label: "4000 K" },
    { T: 5000, color: "#ffd97a", label: "5000 K" },
    { T: 6000, color: "#fff8a0", label: "6000 K (≈ Sun)" },
    { T: 7000, color: "#a3d8ff", label: "7000 K" },
  ];
  const W = 380, H = 240;
  const padL = 44, padR = 16, padT = 22, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const lambdaMin = 100; // nm
  const lambdaMax = 2000;
  // Find global max for scaling
  const planck = (lambdaNm: number, T: number) => {
    const lambda = lambdaNm * 1e-9; // m
    const h = 6.626e-34, c = 3e8, k = 1.381e-23;
    const ex = Math.exp((h * c) / (lambda * k * T));
    return (2 * h * c * c) / (Math.pow(lambda, 5) * (ex - 1));
  };
  let globalMax = 0;
  for (const { T } of curves) {
    for (let l = lambdaMin; l <= lambdaMax; l += 20) {
      const v = planck(l, T);
      if (v > globalMax) globalMax = v;
    }
  }
  const x = (l: number) =>
    padL + ((l - lambdaMin) / (lambdaMax - lambdaMin)) * innerW;
  const y = (v: number) => padT + innerH - (v / globalMax) * innerH;

  let paths = "";
  const peaks: Array<{ T: number; lambda: number; v: number; color: string; label: string }> = [];
  for (const { T, color, label } of curves) {
    let d = "";
    let peakL = lambdaMin;
    let peakV = 0;
    for (let l = lambdaMin; l <= lambdaMax; l += 4) {
      const v = planck(l, T);
      d += `${d === "" ? "M" : "L"} ${x(l).toFixed(1)} ${y(v).toFixed(1)} `;
      if (v > peakV) {
        peakV = v;
        peakL = l;
      }
    }
    paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`;
    // Label on the descending IR tail of each curve, where there's
    // room — far enough right that the labels don't overlap one
    // another near the peaks.
    const labelLambda = peakL + 350;
    const labelV = planck(labelLambda, T);
    paths += `<text x="${(x(labelLambda) + 4).toFixed(1)}" y="${(y(labelV) - 3).toFixed(1)}" fill="${color}" font-size="11">${label}</text>`;
    // Filled circle on each peak.
    paths += `<circle cx="${x(peakL).toFixed(1)}" cy="${y(peakV).toFixed(1)}" r="3" fill="${color}" stroke="#0c1326" stroke-width="0.8"/>`;
    peaks.push({ T, lambda: peakL, v: peakV, color, label });
  }

  // Wien-law trace through every peak — runs from the cool 3000 K
  // peak in the IR up to the hot 7000 K peak in the visible.
  let wienD = "";
  for (const p of peaks) {
    wienD += `${wienD === "" ? "M" : "L"} ${x(p.lambda).toFixed(1)} ${y(p.v).toFixed(1)} `;
  }

  // Faint rainbow band marking the visible portion of the spectrum.
  const rainbow = `
    <linearGradient id="visRainbow" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#7a4dd1"/>
      <stop offset="20%" stop-color="#3a6fff"/>
      <stop offset="45%" stop-color="#3ec27a"/>
      <stop offset="65%" stop-color="#ffe24a"/>
      <stop offset="80%" stop-color="#ff9a3a"/>
      <stop offset="100%" stop-color="#ff4a4a"/>
    </linearGradient>`;
  const visBand =
    `<rect x="${x(380).toFixed(1)}" y="${padT}" width="${(x(740) - x(380)).toFixed(1)}" height="${innerH}" fill="url(#visRainbow)" opacity="0.22"/>` +
    `<text x="${((x(380) + x(740)) / 2).toFixed(1)}" y="${padT - 5}" fill="#cfd6e8" font-size="10" text-anchor="middle">visible</text>`;

  // Wavelength axis ticks every 500 nm.
  let xTicks = "";
  for (const tick of [200, 500, 1000, 1500, 2000]) {
    xTicks += `<line x1="${x(tick)}" y1="${padT + innerH}" x2="${x(tick)}" y2="${padT + innerH + 4}" stroke="#9aa6c2" stroke-width="0.6"/>`;
    xTicks += `<text x="${x(tick)}" y="${padT + innerH + 16}" fill="#9aa6c2" font-size="9" text-anchor="middle">${tick}</text>`;
  }

  return `<figure class="hwk-fig"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Blackbody curves at 3000-7000 K">
    <defs>${rainbow}</defs>
    <rect x="${padL}" y="${padT}" width="${innerW}" height="${innerH}" fill="#0c1326" stroke="#2a3654"/>
    ${visBand}
    ${paths}
    <path d="${wienD}" fill="none" stroke="#ff5a5a" stroke-width="1.4" stroke-dasharray="4,3" opacity="0.85"/>
    <text x="${(x(peaks[2].lambda) - 6).toFixed(1)}" y="${(y(peaks[2].v) - 8).toFixed(1)}" fill="#ff8585" font-size="10" font-style="italic" text-anchor="end">peaks shift ←</text>
    ${xTicks}
    <text x="${padL + innerW / 2}" y="${H - 6}" fill="#9aa6c2" font-size="10" text-anchor="middle">wavelength (nm)</text>
    <text x="14" y="${padT + innerH / 2}" fill="#9aa6c2" font-size="10" text-anchor="middle" transform="rotate(-90 14 ${padT + innerH / 2})">spectral intensity →</text>
  </svg><figcaption>The diagram shows the emission of light from five hot objects at 3000 K (red) up to 7000 K (blue), with the <em>amount</em> of light emitted on the left, and the wavelength along the bottom. As temperature rises, the peak shifts to shorter wavelengths. The curve getting taller shows that more energy is radiated as well — but it's the peak that tells us the temperature.</figcaption></figure>`;
}

function realSpectrumSvg(): string {
  // Real measured solar spectrum, ASTM E-490 (extraterrestrial /
  // "AM0" — no atmosphere). Sample points are the published values
  // of spectral irradiance at the top of Earth's atmosphere, in
  // W/m²/nm. Reproduced here as a vector graph so it stays sharp at
  // any zoom level.
  //
  // Source: NREL Solar Position Algorithm reference data set,
  // derived from ASTM E-490, public domain. Sample points have been
  // hand-picked at ~25 nm spacing across the most informative range
  // (200-2200 nm). The major absorption-line dips (Fraunhofer lines)
  // are visible as small dents in the envelope; their identities are
  // a topic for another day.
  const data: ReadonlyArray<readonly [number, number]> = [
    [200, 0.027], [220, 0.046], [240, 0.043], [260, 0.084],
    [280, 0.213], [300, 0.558], [320, 0.786], [340, 1.00],
    [360, 1.06], [380, 1.13], [395, 1.29], [400, 1.51],
    [420, 1.68], [440, 1.82], [450, 1.92], [460, 1.99],
    [470, 2.02], [480, 2.05], [490, 2.07], [500, 2.08],
    [510, 2.05], [520, 1.99], [540, 1.92], [560, 1.85],
    [580, 1.82], [600, 1.74], [620, 1.69], [640, 1.65],
    [660, 1.55], [680, 1.46], [700, 1.38], [750, 1.20],
    [800, 1.05], [850, 0.93], [900, 0.78], [950, 0.66],
    [1000, 0.61], [1100, 0.49], [1200, 0.39], [1400, 0.27],
    [1600, 0.18], [1800, 0.13], [2000, 0.10], [2200, 0.075],
  ];
  const W = 380, H = 240;
  const padL = 44, padR = 16, padT = 22, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const lambdaMin = 200, lambdaMax = 2200;
  const yMax = 2.2;
  const x = (l: number) =>
    padL + ((l - lambdaMin) / (lambdaMax - lambdaMin)) * innerW;
  const y = (v: number) => padT + innerH - (v / yMax) * innerH;

  // Find the peak.
  let peak = data[0];
  for (const p of data) if (p[1] > peak[1]) peak = p;

  // Build a smooth filled area under the spectrum.
  let area = `M ${x(data[0][0]).toFixed(1)} ${(padT + innerH).toFixed(1)} `;
  for (const [l, v] of data) area += `L ${x(l).toFixed(1)} ${y(v).toFixed(1)} `;
  area += `L ${x(data[data.length - 1][0]).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  // Visible band as a rainbow rectangle behind the curve so the
  // peak's wavelength is easy to read off.
  const rainbow = `
    <linearGradient id="solRainbow" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#7a4dd1"/>
      <stop offset="20%" stop-color="#3a6fff"/>
      <stop offset="45%" stop-color="#3ec27a"/>
      <stop offset="65%" stop-color="#ffe24a"/>
      <stop offset="80%" stop-color="#ff9a3a"/>
      <stop offset="100%" stop-color="#ff4a4a"/>
    </linearGradient>
    <linearGradient id="specFill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#ffd97a" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffd97a" stop-opacity="0.15"/>
    </linearGradient>`;
  const visBand = `<rect x="${x(380).toFixed(1)}" y="${padT}" width="${(x(740) - x(380)).toFixed(1)}" height="${innerH}" fill="url(#solRainbow)" opacity="0.30"/>` +
    `<text x="${((x(380) + x(740)) / 2).toFixed(1)}" y="${padT - 5}" fill="#cfd6e8" font-size="10" text-anchor="middle">visible</text>`;

  // Wavelength axis ticks every 500 nm.
  let xTicks = "";
  for (const tick of [500, 1000, 1500, 2000]) {
    xTicks += `<line x1="${x(tick)}" y1="${padT + innerH}" x2="${x(tick)}" y2="${padT + innerH + 4}" stroke="#9aa6c2" stroke-width="0.6"/>`;
    xTicks += `<text x="${x(tick)}" y="${padT + innerH + 16}" fill="#9aa6c2" font-size="9" text-anchor="middle">${tick}</text>`;
  }

  // Peak marker + Wien-law arrow.
  const peakX = x(peak[0]);
  const peakY = y(peak[1]);
  const peakAnnotation = `
    <line x1="${peakX.toFixed(1)}" y1="${peakY.toFixed(1)}" x2="${peakX.toFixed(1)}" y2="${(padT + innerH).toFixed(1)}" stroke="#ffeb3b" stroke-width="0.8" stroke-dasharray="3,3" opacity="0.7"/>
    <circle cx="${peakX.toFixed(1)}" cy="${peakY.toFixed(1)}" r="3.5" fill="#ffeb3b" stroke="#0c1326" stroke-width="0.8"/>
    <text x="${(peakX + 8).toFixed(1)}" y="${(peakY - 4).toFixed(1)}" fill="#ffeb3b" font-size="10" font-weight="600">peak ≈ ${peak[0]} nm</text>
    <text x="${(peakX + 8).toFixed(1)}" y="${(peakY + 9).toFixed(1)}" fill="#ffeb3b" font-size="9">→ T ≈ b/λ ≈ 5 800 K</text>`;

  return `<figure class="hwk-fig"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Real solar spectrum (ASTM E-490)">
    <defs>${rainbow}</defs>
    <rect x="${padL}" y="${padT}" width="${innerW}" height="${innerH}" fill="#0c1326" stroke="#2a3654"/>
    ${visBand}
    <path d="${area}" fill="url(#specFill)" stroke="#ffd97a" stroke-width="1.2"/>
    ${peakAnnotation}
    ${xTicks}
    <text x="${padL + innerW / 2}" y="${H - 6}" fill="#9aa6c2" font-size="10" text-anchor="middle">wavelength (nm)</text>
    <text x="14" y="${padT + innerH / 2}" fill="#9aa6c2" font-size="10" text-anchor="middle" transform="rotate(-90 14 ${padT + innerH / 2})">spectral irradiance (W/m²/nm)</text>
  </svg><figcaption>This shows the Sun's real spectrum. You can see that it's the same basic shape. (The other dips and peaks tell us about the composition of the Sun — but that's a topic for a different day.) The peak sits at about <strong>500 nm</strong>, in blue-green light. Wien's law allows us to calculate temperature: T ≈ 2.9 × 10⁻³ / 500 × 10⁻⁹ ≈ <strong>5 800 K</strong>. With more accurate measurements, we can calculate the surface temperature more accurately too.</figcaption></figure>`;
}
