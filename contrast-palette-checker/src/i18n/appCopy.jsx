export const APP_COPY = {
  en: {
    language: {
      ariaLabel: "Language",
      switchTo: (label) => `Switch language to ${label}`,
    },
    nav: {
      navigation: "Navigation",
      pages: "Pages",
      home: "Go to Blobb home",
      helpFaq: "Help & FAQ",
      contrastChecker: "Contrast checker",
      scaleGenerator: "Scale generator",
      switchTheme: (theme) => `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
      footerLinks: "Footer links",
      github: "View on GitHub",
    },
    common: {
      add: "Add",
      cancel: "Cancel",
      save: "Save",
      selected: "Selected",
      pass: "Pass",
      fail: "Fail",
      passes: "passes",
      fails: "fails",
      same: "Same",
      grid: "Grid",
      list: "List",
      level: "Level",
      copySnippet: "Copy snippet",
      downloadAse: "Download ASE",
      hexValue: "Hex value",
      colorValueFormat: "Color value format",
      readMoreHelp: "Read more in Help & FAQ",
    },
    statuses: {
      great: "Great",
      good: "Good",
      ok: "Ok",
      poor: "Poor",
    },
    roles: {
      text: "Text",
      background: "Background",
      textColor: "Text color",
      backgroundColor: "Background color",
      bgShort: "Bg",
      base: "Base",
    },
    colorNames: {
      fallback: "Color",
      black: "Black",
      white: "White",
      darkGray: "Dark Gray",
      lightGray: "Light Gray",
      gray: "Gray",
      hues: {
        red: "Red",
        coral: "Coral",
        orange: "Orange",
        amber: "Amber",
        yellow: "Yellow",
        lime: "Lime",
        green: "Green",
        teal: "Teal",
        cyan: "Cyan",
        sky: "Sky",
        blue: "Blue",
        indigo: "Indigo",
        violet: "Violet",
        purple: "Purple",
        pink: "Pink",
        rose: "Rose",
      },
      tones: {
        dark: "Dark",
        pale: "Pale",
        muted: "Muted",
        soft: "Soft",
        bright: "Bright",
        deep: "Deep",
      },
    },
    contrast: {
      heroTitle: "Check whether your colors or palette is readable",
      heroBody:
        "Compare foreground and background colors against WCAG contrast guidelines. Verify that text, icons, buttons, and other UI elements maintain sufficient contrast for readability and accessibility.",
      paletteHelpTitle: "Your palette",
      paletteHelpBody: "Add and manage the colors you want to test across the tools.",
      paletteCount: (count) => `${count}/10 colors`,
      nameColor: "Name color",
      addTwoColors: "Add two colors to compare.",
      selectedColors: "Selected colors",
      selectedHelpBody: "Choose which palette colors act as text and background in manual compare.",
      swap: "Swap",
      manualCompare: "Manual compare",
      paletteCompare: "Palette compare",
      exportPalette: "Export palette",
      compareMode: "Compare mode",
      moreCompareActions: "More compare actions",
      compareActions: "Compare actions",
      noSelection: "No selection yet",
      selectTwoColors: "Select two colors from your palette.",
      contrast: "Contrast",
      contrastHelpBody: "Shows the WCAG ratio and whether the selected pair passes common text and UI thresholds.",
      largeText: "Large text",
      smallText: "Small text",
      graphicsUi: "Graphics & UI Elements",
      usageNotes: {
        largeStrong: "Strong choice for large headings and bold display text.",
        largeOk: "Use for large headings and bold display text, but avoid for critical or long-form reading.",
        largeAvoid: "Not recommended for headings or display text without adjusting one color.",
        smallStrong: "Strong choice for body copy, labels, forms, and small UI text.",
        smallOk: "Use for body copy, labels, forms, and standard UI text, but avoid for small text that needs extra-high contrast.",
        smallAvoid: "Avoid for body copy, labels, forms, and small UI text.",
        uiOk: "Good for icons, control borders, focus states, and visual indicators.",
        uiAvoid: "Avoid for icons, control states, focus indicators, and important graphics.",
      },
      preview: "Preview",
      previewHelpBody: "Shows the selected pair in UI-like examples so the ratio is easier to judge visually.",
      livePreview: "Live preview",
      previewLargeTitle: "Large text, 24px medium",
      previewLargeBold: "Large text, 19px bold",
      previewSmallMedium: "Small text, 16px medium weight",
      previewSmallRegular: "Small text, 16px regular weight",
      previewCaption: "Caption text, 14px regular weight",
      contrastMetric: "contrast",
      uiButtonText: {
        excellent: "Looks excellent",
        good: "Looks good",
        close: "Almost there",
        poor: "Can you even read me?",
      },
      paletteCompareHelpBody: "Scans your palette against itself and highlights which pairs work for normal text.",
      paletteCompareGridCopy: (name, color) => (
        <>
          Compare every color in your palette against every other color. The highlighted row and column show where{" "}
          <strong>
            {name} ({color})
          </strong>{" "}
          works as either text or background.
        </>
      ),
      paletteCompareListCopy: (name, color) => (
        <>
          Compare{" "}
          <strong>
            {name} ({color})
          </strong>{" "}
          against the rest of your palette as a simple list. Each item shows the contrast result for that pair (normal text).
        </>
      ),
      paletteCompareMobileCopy: (name, color) => (
        <>
          Compare{" "}
          <strong>
            {name} ({color})
          </strong>{" "}
          against the rest of your palette as a simple list. Each item shows the contrast result for that pair (normal text). Select another swatch in your
          palette to change the active color.
        </>
      ),
      focusPassingPairs: "Focus passing pairs",
      paletteCompareView: "Palette compare view",
      selectPaletteColor: "Select a color from your palette to compare.",
    },
    scale: {
      heroTitle: "Generate a clean scale from one color",
      heroBody:
        "Select a color from your palette to generate darker and lighter UI steps around it. Create related shades for surfaces, borders, hover states, selected states, and readable color combinations that stay visually consistent.",
      paletteHelpBody: "Select the base color you want to turn into a scale.",
      addOneColor: "Add one color to generate a scale.",
      ariaLabel: "Scale generator",
      generatedScale: "Generated scale",
      generatedScaleHelpBody: "Generates lighter and darker steps from one selected base color.",
      subtitle: (name, color) => (
        <>
          Build lighter and darker steps from {name || "the selected color"} <span className="mono">({color})</span>. Use the steps for surfaces, borders, hover
          states, and readable pairings.
        </>
      ),
      selectColor: "Select a color in your palette to generate its scale.",
      selectColorShort: "Select a color to generate a scale.",
      scaleTools: "Scale tools",
      compareScale: "Compare scale",
      exportScale: "Export scale",
      scaleContrast: "Scale contrast",
      scaleContrastComparison: "Scale contrast comparison",
      scaleContrastCopy:
        "Compare the generated scale steps against each other to find readable text and background pairs. Pairs marked pass meet the normal text threshold.",
      scaleCompareView: "Scale compare view",
      selectActiveScaleColor: "Select active scale color",
      developerExport: "Developer export",
      developerExportType: "Developer export type",
      developerExportCopy: "Copy the scale as CSS variables, a JS object, or JSON tokens.",
    },
    adjust: {
      tuneWithMap: "Tune with contrast map",
      tuneColor: "Tune color",
      tuneTitle: (role) => `Tune ${role} color`,
      showHelp: "Show color tuning help",
      findColors: (name, color) => (
        <>
          Find colors that pass against {name} <span className="mono">({color})</span>.
        </>
      ),
      closeDialog: "Close color adjustment dialog",
      helpText:
        "The map tests possible colors against the opposite selected color. Click a cell to preview it, adjust HSL if needed, then save when the contrast and color feel right.",
      readableText: "Readable text",
      draft: "Draft",
      against: "Against",
      tuneInstead: (role) => `Tune ${role} instead`,
      hue: "Fargetone",
      saturation: "Saturation",
      lightness: "Lightness",
      passingMap: "Passing color map",
      passingMapCopy: "Hue runs left to right. Lightness runs from light to dark.",
      legend: "Contrast map legend",
      passingCandidates: "Passing candidates",
      passingCandidatesCopy: "Tap a larger swatch to preview a passing option.",
      saveColorChange: "Save color change",
    },
    edit: {
      editColor: "Edit color",
      closeDialog: "Close edit color dialog",
      colorName: "Color name",
    },
    export: {
      paletteCopy: "Copy tokens for developers or export a swatch file for design tools.",
      closePaletteDialog: "Close palette export dialog",
      exportType: "Export type",
    },
    aria: {
      editColor: (name, color) => `Edit ${name} ${color}`,
      deleteColor: (name, color) => `Delete ${name} ${color}`,
      copyColor: (name, color) => `Copy ${name} ${color}`,
      copyHex: (color) => `Copy ${color}`,
      selectedHex: (label) => `${label} hex value`,
      tuneSelected: (label) => `Tune ${label} with contrast map`,
      aboutPanel: (title) => `About ${title}`,
      closePanelHelp: (title) => `Close ${title} help`,
      mapCell: (candidate, contrast, passes) => `${candidate}, ${contrast} to 1, ${passes ? "passes" : "fails"}`,
    },
    footer: {
      body: "Palette-first tools for generating color scales and checking WCAG contrast.",
    },
  },
  nb: {
    language: {
      ariaLabel: "Språk",
      switchTo: (label) => `Bytt språk til ${label}`,
    },
    nav: {
      navigation: "Navigasjon",
      pages: "Sider",
      home: "Gå til Blobb-forsiden",
      helpFaq: "Hjelp og FAQ",
      contrastChecker: "Kontrastsjekker",
      scaleGenerator: "Skalagenerator",
      switchTheme: (theme) => `Bytt til ${theme === "dark" ? "lys" : "mørk"} modus`,
      footerLinks: "Lenker i bunntekst",
      github: "Se på GitHub",
    },
    common: {
      add: "Legg til",
      cancel: "Avbryt",
      save: "Lagre",
      selected: "Valgt",
      pass: "Godkjent",
      fail: "Feil",
      passes: "består",
      fails: "feiler",
      same: "Samme",
      grid: "Rutenett",
      list: "Liste",
      level: "Nivå",
      copySnippet: "Kopier kode",
      downloadAse: "Last ned ASE",
      hexValue: "Hex-verdi",
      colorValueFormat: "Fargeformat",
      readMoreHelp: "Les mer i Hjelp og FAQ",
    },
    statuses: {
      great: "Utmerket",
      good: "Bra",
      ok: "Ok",
      poor: "Svakt",
    },
    roles: {
      text: "Tekst",
      background: "Bakgrunn",
      textColor: "Tekstfarge",
      backgroundColor: "Bakgrunnsfarge",
      bgShort: "Bg",
      base: "Base",
    },
    colorNames: {
      fallback: "Farge",
      black: "Svart",
      white: "Hvit",
      darkGray: "Mørk grå",
      lightGray: "Lys grå",
      gray: "Grå",
      hues: {
        red: "Rød",
        coral: "Korall",
        orange: "Oransje",
        amber: "Ravgul",
        yellow: "Gul",
        lime: "Lime",
        green: "Grønn",
        teal: "Turkis",
        cyan: "Cyan",
        sky: "Himmelblå",
        blue: "Blå",
        indigo: "Indigo",
        violet: "Fiolett",
        purple: "Lilla",
        pink: "Rosa",
        rose: "Rose",
      },
      tones: {
        dark: "Mørk",
        pale: "Blek",
        muted: "Dempet",
        soft: "Myk",
        bright: "Klar",
        deep: "Dyp",
      },
    },
    contrast: {
      heroTitle: "Sjekk om fargene eller paletten din er lesbar",
      heroBody:
        "Sammenlign forgrunns- og bakgrunnsfarger mot WCAG sine retningslinjer for kontrast. Kontroller at tekst, ikoner, knapper og andre UI-elementer har nok kontrast for lesbarhet og tilgjengelighet.",
      paletteHelpTitle: "Din palett",
      paletteHelpBody: "Legg til og administrer fargene du vil teste i verktøyene.",
      paletteCount: (count) => `${count}/10 farger`,
      nameColor: "Navngi farge",
      addTwoColors: "Legg til to farger for å sammenligne.",
      selectedColors: "Valgte farger",
      selectedHelpBody: "Velg hvilke palettfarger som brukes som tekst og bakgrunn i manuell sammenligning.",
      swap: "Bytt",
      manualCompare: "Manuell sammenligning",
      paletteCompare: "Palettsammenligning",
      exportPalette: "Eksporter palett",
      compareMode: "Sammenligningsmodus",
      moreCompareActions: "Flere sammenligningsvalg",
      compareActions: "Sammenligningsvalg",
      noSelection: "Ingen valg ennå",
      selectTwoColors: "Velg to farger fra paletten.",
      contrast: "Kontrast",
      contrastHelpBody: "Viser WCAG-forholdet og om fargeparet består vanlige terskler for tekst og UI.",
      largeText: "Stor tekst",
      smallText: "Liten tekst",
      graphicsUi: "Grafikk og UI-elementer",
      usageNotes: {
        largeStrong: "Sterkt valg for store overskrifter og uthevet displaytekst.",
        largeOk: "Kan brukes til store overskrifter og uthevet displaytekst, men unngå kritisk eller lang lesetekst.",
        largeAvoid: "Anbefales ikke for overskrifter eller displaytekst uten å justere en av fargene.",
        smallStrong: "Sterkt valg for brødtekst, etiketter, skjemaer og liten UI-tekst.",
        smallOk: "Kan brukes til brødtekst, etiketter, skjemaer og vanlig UI-tekst, men unngå liten tekst som trenger ekstra høy kontrast.",
        smallAvoid: "Unngå for brødtekst, etiketter, skjemaer og liten UI-tekst.",
        uiOk: "Bra for ikoner, konturkanter, fokusmarkeringer og visuelle indikatorer.",
        uiAvoid: "Unngå for ikoner, kontrolltilstander, fokusmarkeringer og viktig grafikk.",
      },
      preview: "Forhåndsvisning",
      previewHelpBody: "Viser fargeparet i UI-lignende eksempler, slik at kontrasten er enklere å vurdere visuelt.",
      livePreview: "Direkte forhåndsvisning",
      previewLargeTitle: "Stor tekst, 24px medium",
      previewLargeBold: "Stor tekst, 19px fet",
      previewSmallMedium: "Liten tekst, 16px medium vekt",
      previewSmallRegular: "Liten tekst, 16px normal vekt",
      previewCaption: "Bildetekst, 14px normal vekt",
      contrastMetric: "kontrast",
      uiButtonText: {
        excellent: "Ser svært bra ut",
        good: "Ser bra ut",
        close: "Nesten der",
        poor: "Kan du lese meg?",
      },
      paletteCompareHelpBody: "Tester paletten mot seg selv og viser hvilke par som fungerer for normal tekst.",
      paletteCompareGridCopy: (name, color) => (
        <>
          Sammenlign alle fargene i paletten mot hverandre. Den markerte raden og kolonnen viser hvor{" "}
          <strong>
            {name} ({color})
          </strong>{" "}
          fungerer som enten tekst eller bakgrunn.
        </>
      ),
      paletteCompareListCopy: (name, color) => (
        <>
          Sammenlign{" "}
          <strong>
            {name} ({color})
          </strong>{" "}
          mot resten av paletten som en enkel liste. Hvert element viser kontrastresultatet for paret (normal tekst).
        </>
      ),
      paletteCompareMobileCopy: (name, color) => (
        <>
          Sammenlign{" "}
          <strong>
            {name} ({color})
          </strong>{" "}
          mot resten av paletten som en enkel liste. Hvert element viser kontrastresultatet for paret (normal tekst). Velg en annen farge i paletten for å
          endre aktiv farge.
        </>
      ),
      focusPassingPairs: "Fokuser på par som består",
      paletteCompareView: "Visning for palettsammenligning",
      selectPaletteColor: "Velg en farge fra paletten for å sammenligne.",
    },
    scale: {
      heroTitle: "Lag en gradering fra én farge",
      heroBody:
        "Velg en farge fra paletten for å lage mørkere og lysere UI-trinn rundt den. Lag relaterte nyanser for flater, kanter, hover-tilstander, valgte tilstander og lesbare fargekombinasjoner som henger visuelt sammen.",
      paletteHelpBody: "Velg basefargen du vil gjøre om til en skala.",
      addOneColor: "Legg til én farge for å lage en skala.",
      ariaLabel: "Skalagenerator",
      generatedScale: "Generert skala",
      generatedScaleHelpBody: "Lager lysere og mørkere trinn fra én valgt basefarge.",
      subtitle: (name, color) => (
        <>
          Bygg lysere og mørkere trinn fra {name || "den valgte fargen"} <span className="mono">({color})</span>. Bruk trinnene til flater, kanter,
          hover-tilstander og lesbare kombinasjoner.
        </>
      ),
      selectColor: "Velg en farge i paletten for å lage skalaen.",
      selectColorShort: "Velg en farge for å lage en skala.",
      scaleTools: "Skalaverktøy",
      compareScale: "Sammenlign skala",
      exportScale: "Eksporter skala",
      scaleContrast: "Skalakontrast",
      scaleContrastComparison: "Kontrastsammenligning for skala",
      scaleContrastCopy:
        "Sammenlign de genererte skalatrinnene mot hverandre for å finne lesbare tekst- og bakgrunnspar. Par merket som bestått oppfyller terskelen for normal tekst.",
      scaleCompareView: "Visning for skalasammenligning",
      selectActiveScaleColor: "Velg aktiv skalafarge",
      developerExport: "Eksport for utviklere",
      developerExportType: "Eksporttype for utviklere",
      developerExportCopy: "Kopier skalaen som CSS-variabler, et JS-objekt eller JSON-tokens.",
    },
    adjust: {
      tuneWithMap: "Juster med kontrastkart",
      tuneColor: "Juster farge",
      tuneTitle: (role) => `Juster ${role}sfarge`,
      showHelp: "Vis hjelp for fargejustering",
      findColors: (name, color) => (
        <>
          Finn farger som består mot {name} <span className="mono">({color})</span>.
        </>
      ),
      closeDialog: "Lukk dialog for fargejustering",
      helpText:
        "Kartet tester mulige farger mot den motsatte valgte fargen. Klikk på en celle for å forhåndsvise den, juster HSL ved behov, og lagre når kontrast og farge føles riktig.",
      readableText: "Lesbar tekst",
      draft: "Utkast",
      against: "Mot",
      tuneInstead: (role) => `Juster ${role} i stedet`,
      hue: "Hue",
      saturation: "Metning",
      lightness: "Lyshet",
      passingMap: "Kart over farger som består",
      passingMapCopy: "Fargetone går fra venstre til høyre. Lyshet går fra lys til mørk.",
      legend: "Forklaring for kontrastkart",
      passingCandidates: "Kandidater som består",
      passingCandidatesCopy: "Trykk på en større fargeprøve for å forhåndsvise et alternativ som består.",
      saveColorChange: "Lagre fargeendring",
    },
    edit: {
      editColor: "Rediger farge",
      closeDialog: "Lukk dialog for fargeredigering",
      colorName: "Fargenavn",
    },
    export: {
      paletteCopy: "Kopier tokens for utviklere eller eksporter en swatch-fil for designverktøy.",
      closePaletteDialog: "Lukk dialog for paletteksport",
      exportType: "Eksporttype",
    },
    aria: {
      editColor: (name, color) => `Rediger ${name} ${color}`,
      deleteColor: (name, color) => `Slett ${name} ${color}`,
      copyColor: (name, color) => `Kopier ${name} ${color}`,
      copyHex: (color) => `Kopier ${color}`,
      selectedHex: (label) => `${label}, hex-verdi`,
      tuneSelected: (label) => `Juster ${label} med kontrastkart`,
      aboutPanel: (title) => `Om ${title}`,
      closePanelHelp: (title) => `Lukk hjelp for ${title}`,
      mapCell: (candidate, contrast, passes) => `${candidate}, ${contrast} til 1, ${passes ? "består" : "feiler"}`,
    },
    footer: {
      body: "Palettbaserte verktøy for å lage fargeskalaer og sjekke WCAG-kontrast.",
    },
  },
};
