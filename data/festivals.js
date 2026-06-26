// Daten zuletzt aktualisiert: Juni 2026 — Quellen: offizielle Festival-Websites
// Alle Daten verifiziert — immer auf der offiziellen Website gegenchecken!

const festivals = [

  // ══════════════════════════════════════════
  // VERGANGEN 2026 (vor dem 26. Juni 2026)
  // ══════════════════════════════════════════

  {
    name: "TIME WARP 2026",
    date: "2026-03-21",
    dateDisplay: "21. März 2026",
    location: "Maimarkthalle, Mannheim",
    genre: ["Techno"],
    url: "https://www.time-warp.de",
    soldOut: false,
    description: "19 Stunden, 5 Floors — Time Warp verwandelt die Maimarkthalle in ein pulsierendes Techno-Labyrinth."
  },
  {
    name: "MAYDAY 2026",
    date: "2026-04-30",
    dateDisplay: "30. April 2026",
    location: "Westfalenhallen, Dortmund",
    genre: ["Techno", "Hard Techno", "Trance", "Hardcore"],
    url: "https://www.mayday.de",
    soldOut: false,
    description: "Die Mutter aller Raves seit 1991 — härteste Walpurgisnacht Deutschlands in den Westfalenhallen."
  },
  {
    name: "IKARUS FESTIVAL 2026",
    date: "2026-05-25",
    dateDisplay: "22.–25. Mai 2026",
    location: "Flughafen Memmingen",
    genre: ["Techno", "Hardstyle", "Psytrance"],
    url: "https://www.ikarus-festival.de",
    soldOut: false,
    description: "Vier Tage Electronic Music auf dem Flughafen Memmingen — Camping, mehrere Stages, knallendes Line-up."
  },
  {
    name: "WORLD CLUB DOME 2026",
    date: "2026-06-07",
    dateDisplay: "5.–7. Juni 2026",
    location: "Messe Frankfurt, Frankfurt",
    genre: ["Techno", "Hard Techno", "EDM", "House"],
    url: "https://www.worldclubdome.com",
    soldOut: false,
    description: "Das größte Club-Festival der Welt — die Messe Frankfurt wird zum größten Club auf Erden."
  },
  {
    name: "HIVE FESTIVAL 2026",
    date: "2026-06-21",
    dateDisplay: "19.–21. Juni 2026",
    location: "Ferropolis, Gräfenhainichen",
    genre: ["Hard Techno", "Schranz", "Psytrance"],
    url: "https://hivefestival.de",
    soldOut: false,
    description: "Hartes Techno-Gewitter in der Stadt aus Eisen — Ferropolis als brutaler Backdrop für Schranz und Hard Techno."
  },
  {
    name: "RUHR-IN-LOVE 2026",
    date: "2026-06-21",
    dateDisplay: "20.–21. Juni 2026",
    location: "OLGA-Park, Oberhausen",
    genre: ["Techno", "House", "Hardstyle"],
    url: "https://www.ruhr-in-love.de",
    soldOut: false,
    description: "Das Ruhrgebiet tanzt — Open-Air Festival im OLGA-Park mit breitem Electronic-Line-up."
  },
  {
    name: "FUSION FESTIVAL 2026",
    date: "2026-06-29",
    dateDisplay: "24.–29. Juni 2026",
    location: "Kulturkosmos, Lärz",
    genre: ["Techno", "Experimental"],
    url: "https://www.fusion-festival.de",
    soldOut: false,
    description: "Das anarchistische Kultfestival in Mecklenburg — keine Werbung, kein Bullshit, nur Musik und Kunst."
  },

  // ══════════════════════════════════════════
  // BEVORSTEHEND — JULI 2026
  // ══════════════════════════════════════════

  {
    name: "AIRBEAT ONE 2026",
    date: "2026-07-12",
    dateDisplay: "8.–12. Juli 2026",
    location: "Flughafen Neustadt-Glewe",
    genre: ["EDM", "Techno", "Hardstyle"],
    url: "https://www.airbeat-one.de",
    soldOut: false,
    description: "Norddeutschlands größtes Open-Air auf dem Flughafen Neustadt-Glewe — 5 Tage, spektakuläre Shows, hartes Line-up."
  },
  {
    name: "DEICHBRAND 2026",
    date: "2026-07-19",
    dateDisplay: "16.–19. Juli 2026",
    location: "Seeflughafen Cuxhaven/Nordholz",
    genre: ["Techno", "Electronic", "Rock"],
    url: "https://www.deichbrand.de",
    soldOut: false,
    description: "Festival am Nordsee-Deich in Cuxhaven — Techno, Rock und Meer in einem einzigartigen Setting."
  },
  {
    name: "PAROOKAVILLE 2026",
    date: "2026-07-19",
    dateDisplay: "17.–19. Juli 2026",
    location: "Airport Weeze, Weeze",
    genre: ["EDM", "Techno", "Hard Techno", "Trance"],
    url: "https://www.parookaville.com",
    soldOut: false,
    description: "Die verrückteste Stadt der Welt lebt drei Tage auf dem Flughafen Weeze — Hard Techno Stage inklusive."
  },
  {
    name: "LOLLAPALOOZA BERLIN 2026",
    date: "2026-07-19",
    dateDisplay: "18.–19. Juli 2026",
    location: "Olympiastadion & Olympiapark, Berlin",
    genre: ["Techno", "Electronic", "Pop", "Rock"],
    url: "https://www.lollapaloozade.com",
    soldOut: false,
    description: "Das globale Kultfestival im Olympiapark Berlin — mit starker Techno- und Electronic-Vertretung auf mehreren Stages."
  },
  {
    name: "FEEL FESTIVAL 2026",
    date: "2026-07-26",
    dateDisplay: "23.–26. Juli 2026",
    location: "Bergheider See, Brandenburg",
    genre: ["Techno", "Electronic"],
    url: "https://www.feel-festival.de",
    soldOut: false,
    description: "Intimes Techno-Festival am Bergheider See in Brandenburg — underground, naturverbunden, unvergesslich."
  },
  {
    name: "OPEN BEATZ 2026",
    date: "2026-07-26",
    dateDisplay: "24.–26. Juli 2026",
    location: "Flugplatz Feucht, Nürnberg",
    genre: ["Techno", "Hard Techno", "EDM"],
    url: "https://www.openbeatz.de",
    soldOut: false,
    description: "Bayerisches Open-Air auf dem Flugplatz bei Nürnberg — hartes Line-up, mehrtägiges Camping, keine Kompromisse."
  },
  {
    name: "JUICY BEATS 2026",
    date: "2026-07-26",
    dateDisplay: "25.–26. Juli 2026",
    location: "Westfalenpark, Dortmund",
    genre: ["Techno", "Electronic", "House"],
    url: "https://www.juicybeats.net",
    soldOut: false,
    description: "Dortmunds Open-Air Festival im Westfalenpark — 25+ Jahre Electronic und Indie unter freiem Himmel."
  },

  // ══════════════════════════════════════════
  // BEVORSTEHEND — AUGUST 2026
  // ══════════════════════════════════════════

  {
    name: "NATURE ONE 2026",
    date: "2026-08-02",
    dateDisplay: "30. Juli – 2. Aug 2026",
    location: "Raketenbasis Pydna, Kastellaun",
    genre: ["Techno", "Trance", "Hardstyle"],
    url: "https://www.nature-one.de",
    soldOut: false,
    description: "350+ Artists, 20 Floors — auf einer ehemaligen NATO-Raketenbasis. Seit 1996 Deutschlands ältestes Freiluft-Rave-Festival."
  },
  {
    name: "ELECTRISIZE 2026",
    date: "2026-08-09",
    dateDisplay: "7.–9. Aug 2026",
    location: "bei Düsseldorf, NRW",
    genre: ["EDM", "Techno", "Hardstyle"],
    url: "https://www.electrisize.de",
    soldOut: false,
    description: "Großes Electronic Festival bei Düsseldorf — mehrere Stages, internationales Line-up, Camping."
  },
  {
    name: "MS DOCKVILLE 2026",
    date: "2026-08-15",
    dateDisplay: "14.–15. Aug 2026",
    location: "Hamburg-Wilhelmsburg",
    genre: ["Techno", "Electronic", "House", "Indie"],
    url: "https://www.msdockville.de",
    soldOut: false,
    description: "Hamburgs Kultfestival für Musik und Kunst in Wilhelmsburg — urban, kreativ, mit starkem Electronic-Anteil."
  },
  {
    name: "HIGHFIELD FESTIVAL 2026",
    date: "2026-08-16",
    dateDisplay: "13.–16. Aug 2026",
    location: "Störmthaler See, Leipzig/Grosspösna",
    genre: ["Techno", "Electronic", "Rock", "Indie"],
    url: "https://www.highfield.de",
    soldOut: false,
    description: "Vier Tage Rock und Electronic am Störmthaler See bei Leipzig — mit Badestrand und wachsendem Techno-Anteil."
  },
  {
    name: "SONNE MOND STERNE 2026",
    date: "2026-08-23",
    dateDisplay: "ca. Aug 2026",
    location: "Halbinsel Pouch, Bitterfeld",
    genre: ["Techno", "Trance"],
    url: "https://www.sms-festival.de",
    soldOut: false,
    description: "SMS am Muldestausee — Camping, Seenblick und drei Tage Techno und Trance in Mitteldeutschland."
  },

  // ══════════════════════════════════════════
  // BEVORSTEHEND — HERBST / WINTER 2026
  // ══════════════════════════════════════════

  {
    name: "SYNDICATE 2026",
    date: "2026-10-03",
    dateDisplay: "3. Okt 2026",
    location: "Westfalenhallen, Dortmund",
    genre: ["Hard Techno", "Hardcore", "Hardstyle", "Schranz"],
    url: "https://www.syndicate-festival.de",
    soldOut: false,
    description: "Deutschlands größtes Harder-Styles-Festival — SYNDICATE in den Westfalenhallen für Hard Techno und Hardcore-Jünger."
  },

  // ══════════════════════════════════════════
  // BEVORSTEHEND — 2027
  // ══════════════════════════════════════════

  {
    name: "TIME WARP 2027",
    date: "2027-04-03",
    dateDisplay: "3. April 2027",
    location: "Maimarkthalle, Mannheim",
    genre: ["Techno"],
    url: "https://www.time-warp.de",
    soldOut: false,
    description: "19 Stunden, 5 Floors — das jährliche Techno-Pilgerfest kehrt 2027 nach Mannheim zurück."
  },
  {
    name: "MAYDAY 2027",
    date: "2027-04-30",
    dateDisplay: "30. April 2027",
    location: "Westfalenhallen, Dortmund",
    genre: ["Techno", "Hard Techno", "Trance", "Hardcore"],
    url: "https://www.mayday.de",
    soldOut: false,
    description: "Die nächste Walpurgisnacht — Tickets sichern bevor sie weg sind."
  },
  {
    name: "IKARUS FESTIVAL 2027",
    date: "2027-06-27",
    dateDisplay: "25.–27. Juni 2027",
    location: "Flughafen Memmingen",
    genre: ["Techno", "Hardstyle", "Psytrance"],
    url: "https://www.ikarus-festival.de",
    soldOut: false,
    description: "Vier Tage Electronic Music auf dem Flughafen Memmingen — Camping, mehrere Stages, knallendes Line-up."
  },
  {
    name: "WORLD CLUB DOME 2027",
    date: "2027-06-06",
    dateDisplay: "4.–6. Juni 2027",
    location: "Messe Frankfurt, Frankfurt",
    genre: ["Techno", "Hard Techno", "EDM", "House"],
    url: "https://www.worldclubdome.com",
    soldOut: false,
    description: "Das größte Club-Festival der Welt — Early Bird Tickets bereits erhältlich für €129."
  }

];

export default festivals;
