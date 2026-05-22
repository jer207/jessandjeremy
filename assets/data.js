// Wedding guest data
// In production, this is replaced by a fetch to the Apps Script backend.
// Each household has: id, slug for display, tier ('day2' or 'both'),
// adults (1-2), children (first names), plusOneAllowed (only for singles).

const WEDDING = {
  coupleFirstNames: ['Jeremy', 'Jess'],
  coupleDisplay: 'Jeremy & Jess',
  dayOne: {
    label: 'Friday, October 2, 2026',
    title: 'Ceremony & Welcome Dinner',
    location: "Tops'l Farm, Waldoboro, Maine",
    details: 'Ceremony at 4:00 p.m. in the orchard, followed by dinner under the lights. Intimate gathering — about 30 guests.'
  },
  dayTwo: {
    label: 'Saturday, October 3, 2026',
    title: 'Reception',
    location: "Tops'l Farm, Waldoboro, Maine",
    details: 'Cocktails at 5:00 p.m., dinner at 6:30, dancing until late. A bigger crowd, a longer night.'
  },
  contactEmail: 'rsvp@example.com',
  rsvpDeadline: 'August 15, 2026',
  directionsUrl: 'https://maps.app.goo.gl/bbmc8aQQsjghYuvv7',
  registryUrl: '#',
  topslLodgingUrl: 'https://www.wetravel.com/trips/jessica-jeremy-s-wedding-lodging-tops-l-farm-39955021#about-your-trip',
  // Off-site accommodations for Day-2-only guests
  accommodations: [
    { name: 'Sample Inn — Damariscotta', distance: '12 min from venue', note: 'Classic Maine inn with restaurant on site.', url: '#' },
    { name: 'Sample B&B — Waldoboro', distance: '5 min from venue', note: 'Closest to the farm; small, books up early.', url: '#' },
    { name: 'Sample Hotel — Rockland', distance: '25 min from venue', note: 'Larger property; walkable downtown.', url: '#' }
  ],
  // Things to do in Midcoast Maine
  thingsToDo: [
    { name: 'Pemaquid Point Lighthouse', note: 'Iconic lighthouse on the rocks, 30 min south.' },
    { name: 'Damariscotta', note: 'Walkable downtown for lunch, oysters, and a stroll on the river.' },
    { name: 'Camden Hills State Park', note: 'Mount Battie summit for the best view in Midcoast.' },
    { name: 'Monhegan Island day trip', note: 'Ferry from New Harbor; bring layers and good shoes.' }
  ]
};

// Admins can look themselves up and reach the admin dashboard.
// Keep this list short; match is case-insensitive on first or full name.
const ADMINS = ['Jeremy', 'Jess'];

const HOUSEHOLDS = [
  {
    id: 'carroll',
    tier: 'both',
    adults: [
      { firstName: 'Margaret', lastName: 'Carroll', email: 'margaret.carroll@example.com' },
      { firstName: 'Daniel', lastName: 'Carroll', email: 'daniel.carroll@example.com' }
    ],
    children: ['Sophie', 'Theo'],
    plusOneAllowed: false,
    topslLodgingNote: "We've reserved the farmhouse for your family — please book the 'Farmhouse — Carroll' option."
  },
  {
    id: 'pratt',
    tier: 'both',
    adults: [
      { firstName: 'Eleanor', lastName: 'Pratt', email: 'eleanor.pratt@example.com' },
      { firstName: 'James', lastName: 'Pratt', email: 'james.pratt@example.com' }
    ],
    children: [],
    plusOneAllowed: false
  },
  {
    id: 'brennan',
    tier: 'both',
    adults: [
      { firstName: 'Rachel', lastName: 'Brennan', email: 'rachel.brennan@example.com' }
    ],
    children: [],
    plusOneAllowed: true
  },
  {
    id: 'okonkwo',
    tier: 'both',
    adults: [
      { firstName: 'David', lastName: 'Okonkwo', email: 'david.okonkwo@example.com' }
    ],
    children: [],
    plusOneAllowed: false
  },
  {
    id: 'nguyen',
    tier: 'day2',
    adults: [
      { firstName: 'Linh', lastName: 'Nguyen', email: 'linh.nguyen@example.com' },
      { firstName: 'Marcus', lastName: 'Nguyen', email: 'marcus.nguyen@example.com' }
    ],
    children: ['Oliver'],
    plusOneAllowed: false
  },
  {
    id: 'rosen',
    tier: 'day2',
    adults: [
      { firstName: 'Amelia', lastName: 'Rosen', email: 'amelia.rosen@example.com' }
    ],
    children: [],
    plusOneAllowed: true
  },
  {
    id: 'hassani',
    tier: 'day2',
    adults: [
      { firstName: 'Walter', lastName: 'Hassani', email: 'walter.hassani@example.com' }
    ],
    children: [],
    plusOneAllowed: false
  },
  {
    id: 'petrov',
    tier: 'day2',
    adults: [
      { firstName: 'Anya', lastName: 'Petrov', email: 'anya.petrov@example.com' },
      { firstName: 'Mikhail', lastName: 'Petrov', email: 'mikhail.petrov@example.com' }
    ],
    children: [],
    plusOneAllowed: false
  },
  {
    id: 'kowalski',
    tier: 'day2',
    adults: [
      { firstName: 'Beth', lastName: 'Kowalski', email: 'beth.kowalski@example.com' },
      { firstName: 'Tom', lastName: 'Kowalski', email: 'tom.kowalski@example.com' }
    ],
    children: ['Maya', 'Lucas', 'Iris'],
    plusOneAllowed: false
  },
  {
    id: 'hartley',
    tier: 'day2',
    adults: [
      { firstName: 'Susan', lastName: 'Hartley', email: 'susan.hartley@example.com' },
      { firstName: 'Robert', lastName: 'Hartley', email: 'robert.hartley@example.com' }
    ],
    children: [],
    plusOneAllowed: false
  },
  {
    id: 'chakraborty',
    tier: 'day2',
    adults: [
      { firstName: 'Priya', lastName: 'Chakraborty', email: 'priya.chakraborty@example.com' }
    ],
    children: [],
    plusOneAllowed: true
  },
  {
    id: 'lemieux',
    tier: 'day2',
    adults: [
      { firstName: 'Frank', lastName: 'Lemieux', email: 'frank.lemieux@example.com' }
    ],
    children: [],
    plusOneAllowed: false
  }
];
