// Daten zuletzt aktualisiert: Juni 2026 — Daten immer auf der offiziellen Website prüfen

const festivals = [
  // ─── VERGANGEN 2026 ───
  {
    name: "TIME WARP 2026",
    date: "2026-03-21",
    dateDisplay: "21. März 2026",
    location: "Maimarkthalle, Mannheim",
    genre: ["Techno"],
    url: "https://www.time-warp.de",
    soldOut: false,
    description: "Einer der renommiertesten Techno-Events Europas — die Maimarkthalle als pulsierendes Underground-Labyrinth."
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
    name: "FULL FORCE 2026",
    date: "2026-06-21",
    dateDisplay: "19.–21. Juni 2026",
    location: "Ferropolis, Gräfenhainichen",
    genre: ["Hardcore", "Hard Techno", "Metalcore"],
    url: "https://www.full-force-festival.de",
    soldOut: false,
    description: "Hartes Metal- und Hardcore-Festival in der Stadt aus Eisen — für alle die lauter wollen."
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
    date: "2026-06-20",
    dateDisplay: "ca. Juni 2026",
    location: "OLGA-Park, Oberhausen",
    genre: ["Techno", "House", "Hardstyle"],
    url: "https://www.ruhr-in-love.de",
    soldOut: false,
    description: "Das Ruhrgebiet tanzt — Open-Air Festival im OLGA-Park mit breitem Electronic-Line-up."
  },
  {
    name: "KOSMONAUT FESTIVAL 2026",
    date: "2026-06-27",
    dateDisplay: "26.–27. Juni 2026",
    location: "Festwiese, Chemnitz",
    genre: ["Techno", "Electronic", "Indie Electronic"],
    url: "https://www.kosmonauten.de",
    soldOut: false,
    description: "Sachsens Festival-Highlight in Chemnitz — breites Electronic-Line-up mit Underground-Techno-Vibes."
  },

  // ─── BEVORSTEHEND 2026 ───
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
  {
    name: "WORLD CLUB DOME 2026",
    date: "2026-07-05",
    dateDisplay: "3.–5. Juli 2026",
    location: "Messe Frankfurt, Frankfurt",
    genre: ["Techno", "Hard Techno", "EDM", "House"],
    url: "https://www.worldclubdome.com",
    soldOut: false,
    description: "Das größte Club-Festival der Welt — die Messe Frankfurt wird zum größten Club auf Erden."
  },
  {
    name: "JUICY BEATS 2026",
    date: "2026-07-18",
    dateDisplay: "17.–18. Juli 2026",
    location: "Westfalenpark, Dortmund",
    genre: ["Techno", "Electronic", "House"],
    url: "https://www.juicybeats.net",
    soldOut: false,
    description: "Dortmunds Open-Air Festival im Westfalenpark — 25+ Jahre Electronic und Indie unter freiem Himmel."
  },
  {
    name: "MELT FESTIVAL 2026",
    date: "2026-07-19",
    dateDisplay: "17.–19. Juli 2026",
    location: "Ferropolis, Gräfenhainichen",
    genre: ["Techno", "Electronic", "Indie Electronic"],
    url: "https://www.melt.de",
    soldOut: false,
    description: "Ferropolis zum zweiten — MELT verbindet Indie, Electronic und Techno auf der ikonischen Stadt aus Eisen."
  },
  {
    name: "STONE TECHNO 2026",
    date: "2026-07-12",
    dateDisplay: "10.–12. Juli 2026",
    location: "Zeche Zollverein, Essen",
    genre: ["Techno"],
    url: "https://stonetechno.com",
    soldOut: false,
    description: "Roher Techno auf dem UNESCO-Welterbe Zeche Zollverein — industrielles Erbe trifft puren Underground-Sound."
  },
  {
    name: "ELECTRISIZE 2026",
    date: "2026-07-12",
    dateDisplay: "10.–12. Juli 2026",
    location: "Haunstetten, Augsburg",
    genre: ["EDM", "Techno", "Hardstyle"],
    url: "https://www.electrisize.de",
    soldOut: false,
    description: "Süddeutschlands großes Electronic Festival in Augsburg — mehrere Stages, internationales Line-up."
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
    name: "DEICHBRAND 2026",
    date: "2026-07-19",
    dateDisplay: "16.–19. Juli 2026",
    location: "Seeflughafen, Cuxhaven",
    genre: ["Techno", "Electronic", "Rock"],
    url: "https://www.deichbrand.de",
    soldOut: false,
    description: "Festival am Nordsee-Deich in Cuxhaven — Techno, Rock und Meer in einem."
  },
  {
    name: "AIRBEAT ONE 2026",
    date: "2026-07-26",
    dateDisplay: "22.–26. Juli 2026",
    location: "Flughafen Neustadt-Glewe",
    genre: ["EDM", "Techno", "Hardstyle"],
    url: "https://www.airbeat-one.de",
    soldOut: false,
    description: "Norddeutschlands größtes Open-Air auf dem Flughafen Neustadt-Glewe — spektakuläre Shows und hartes Line-up."
  },
  {
    name: "OPEN BEATZ 2026",
    date: "2026-07-30",
    dateDisplay: "ca. Ende Juli 2026",
    location: "Flugplatz Feucht, Nürnberg",
    genre: ["Techno", "Hard Techno", "EDM"],
    url: "https://www.openbeatz.de",
    soldOut: false,
    description: "Bayerisches Open-Air auf dem Flugplatz Feucht — hartes Line-up, mehrtägiges Camping, keine Kompromisse."
  },
  {
    name: "NATURE ONE 2026",
    date: "2026-08-02",
    dateDisplay: "31. Juli – 2. Aug 2026",
    location: "Pydna Raketenbasis, Kaiserslautern",
    genre: ["Techno", "Trance", "Hardstyle"],
    url: "https://www.nature-one.de",
    soldOut: false,
    description: "Auf einer ehemaligen NATO-Raketenbasis in der Pfalz — seit 1996 Deutschlands ältestes Freiluft-Rave-Festival."
  },
  {
    name: "FEEL FESTIVAL 2026",
    date: "2026-08-09",
    dateDisplay: "6.–10. Aug 2026",
    location: "Märkische Schweiz, Brandenburg",
    genre: ["Techno", "Electronic"],
    url: "https://www.feel-festival.de",
    soldOut: false,
    description: "Kleines feines Techno-Festival in der Natur Brandenburgs — intim, underground, unvergesslich."
  },
  {
    name: "HIGHFIELD FESTIVAL 2026",
    date: "2026-08-16",
    dateDisplay: "14.–16. Aug 2026",
    location: "Störmthaler See, Sachsen",
    genre: ["Techno", "Electronic", "Rock"],
    url: "https://www.highfield.de",
    soldOut: false,
    description: "Sachsens Sommer-Festival am Störmthaler See — Rock, Electronic und Techno mit Badestrand-Bonus."
  },
  {
    name: "SONNE MOND STERNE 2026",
    date: "2026-08-16",
    dateDisplay: "ca. August 2026",
    location: "Halbinsel Pouch, Bitterfeld",
    genre: ["Techno", "Trance"],
    url: "https://www.sms-festival.de",
    soldOut: false,
    description: "SMS am Muldestausee — Camping, Seenblick und drei Tage Techno und Trance in Mitteldeutschland."
  },
  {
    name: "MS DOCKVILLE 2026",
    date: "2026-08-21",
    dateDisplay: "20.–22. Aug 2026",
    location: "Reiherstiegwiesen, Hamburg",
    genre: ["Techno", "Electronic", "House"],
    url: "https://www.msdockville.de",
    soldOut: false,
    description: "Hamburgs Kultfestival an der Elbe — Kunst, Musik und Techno in einzigartiger Hafen-Atmosphäre."
  },
  {
    name: "LOLLAPALOOZA BERLIN 2026",
    date: "2026-09-13",
    dateDisplay: "12.–13. Sep 2026",
    location: "Olympiagelände, Berlin",
    genre: ["Techno", "Electronic", "Pop"],
    url: "https://www.lollapaloozade.com",
    soldOut: false,
    description: "Das globale Kultfestival macht Station in Berlin — mit starker Techno- und Electronic-Vertretung."
  },
  {
    name: "SYNDICATE 2026",
    date: "2026-10-10",
    dateDisplay: "9.–10. Okt 2026",
    location: "Westfalenhallen, Dortmund",
    genre: ["Hard Techno", "Hardcore", "Schranz"],
    url: "https://www.syndicate-festival.de",
    soldOut: false,
    description: "Deutschlands härtestes Festival — SYNDICATE in den Westfalenhallen für Hard Techno und Hardcore-Jünger."
  },
  {
    name: "TRAUMATICA 2026",
    date: "2026-10-24",
    dateDisplay: "ca. Oktober 2026",
    location: "Westfalenhallen, Dortmund",
    genre: ["Hardcore", "Hard Techno", "Schranz"],
    url: "https://www.traumatica.de",
    soldOut: false,
    description: "Halloween-Hardcore-Event in Dortmund — für alle die es dunkler, härter und beängstigender wollen."
  },
  {
    name: "MASTERS OF HARDCORE GERMANY 2026",
    date: "2026-11-07",
    dateDisplay: "ca. November 2026",
    location: "Westfalenhallen, Dortmund",
    genre: ["Hardcore", "Hard Techno"],
    url: "https://www.mastersofhardcore.com",
    soldOut: false,
    description: "Die Mutter des Hardcore macht Station in Deutschland — brutalste Beats, härteste Basslines."
  },
  {
    name: "NATURE ONE WINTER 2026",
    date: "2026-12-27",
    dateDisplay: "26.–27. Dez 2026",
    location: "Westfalenhallen, Dortmund",
    genre: ["Techno", "Trance", "Hard Techno"],
    url: "https://www.nature-one.de",
    soldOut: false,
    description: "Nature One zwischen den Jahren — Techno und Trance als perfekte Alternative zu Weihnachtsmann und Glühwein."
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
    name: "TIME WARP 2027",
    date: "2027-03-20",
    dateDisplay: "ca. März 2027",
    location: "Maimarkthalle, Mannheim",
    genre: ["Techno"],
    url: "https://www.time-warp.de",
    soldOut: false,
    description: "Das jährliche Techno-Pilgerfest in Mannheim — Underground pur in der Maimarkthalle."
  }
];

export default festivals;
