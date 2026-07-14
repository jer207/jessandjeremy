// Wedding guest data
// In production, this is replaced by a fetch to the Apps Script backend.
// Each household has: id, slug for display, tier ('day2' or 'both'),
// adults (1-2), children (first names), plusOneAllowed (only for singles).

const WEDDING = {
  coupleFirstNames: ['Jess', 'Jeremy'],
  coupleDisplay: 'Jess & Jeremy',
  dayOne: {
    label: 'Friday, October 2, 2026',
    title: 'Ceremony & Dinner',
    location: "Tops'l Farm, Waldoboro, Maine",
    details: 'Ceremony at 4:00 p.m. in the woods, followed by dinner in the glass house. Intimate gathering — about 40 guests.'
  },
  dayTwo: {
    label: 'Saturday, October 3, 2026',
    title: 'Lobster Bake & Celebration',
    location: "Tops'l Farm, Waldoboro, Maine",
    details: 'Cocktails at 5:00 p.m., lobster bake at 6:30, dancing with live band and DJ. Casual, larger group.'
  },
  dayThree: {
    label: 'Sunday, October 4, 2026',
    title: 'Lazy Morning & Checkout',
    location: "Tops'l Farm, Waldoboro, Maine",
    details: "Sleep in a little, checkout by noon, and maybe join us at Moody's Diner nearby for strawberry pie or brunch."
  },
  // Footnote shown above the itinerary for everyone.
  itineraryNote: "*Exact timing may change — we'll update this website with the latest closer to the big day.",
  // Both-day guests see Saturday as three stacked blocks inside one card.
  saturdaySections: [
    { title: 'Light Breakfast', body: "We've arranged for some locally baked bagels and delicious condiments to fuel you for the rest of the day." },
    { title: 'Explore Midcoast Maine', body: "While we're busy setting things up, take the opportunity to either rest, relax, and hang out on the beautiful property, or hit the road and check out some of the local attractions — we've listed some fun ideas below." },
    { title: 'Lobster Bake & Celebration', body: 'Cocktails at 5:00 p.m., lobster bake at 6:30, dancing with live band and DJ. Casual, larger group.' }
  ],
  // Day-2-only guests see this copy in their single Saturday card.
  dayTwoDay2Details: "We're keeping the ceremony itself small and quiet, just us and a few others, the day before. We hope you'll join us here for the most important part: the party. Cocktails at 5:00 p.m., Lobster Bake at 6:30, dancing with live band and DJ.",
  contactEmail: 'hello@jessandjeremy.com',
  rsvpDeadline: 'August 15, 2026',
  directionsUrl: 'https://maps.app.goo.gl/bbmc8aQQsjghYuvv7',
  registryUrl: 'https://www.myregistry.com/wedding-registry/jess-sokolow-and-jeremy-hammond-portland-maine/5453639/giftlist',
  // Off-site accommodation recommendations (shown when a household has no lodge_key assignment)
  accommodations: [
    {
      name: 'Newcastle Inn',
      url: 'https://www.newcastleinn.com/',
      distance: '15 min from venue',
      note: 'A historic riverside inn in the village of Newcastle, moments from Damariscotta\'s shops and restaurants. The closest stay on this list to the farm, with a well-loved breakfast to start the day.'
    },
    {
      name: 'Rockland Harbor Hotel',
      url: 'https://www.rocklandharborhotel.com/',
      distance: '30 min from venue',
      note: 'Reliable harbor-view hotel with free breakfast and easy parking. Nothing flashy, fair price for the area.'
    },
    {
      name: '250 Main',
      url: 'https://250mainhotel.com/',
      distance: '30 min from venue',
      note: 'Boutique art hotel with a rooftop terrace overlooking Rockland harbor. Higher-end, but a memorable spot if you want to make a night of it.'
    },
    {
      name: 'The Samoset Resort',
      url: 'https://www.opalcollection.com/samoset/',
      distance: '35 min from venue',
      note: "The full Maine resort experience: oceanfront rooms, championship golf, full spa, 230 acres of grounds. Easily the priciest option on this list — worth it if you're planning to turn the wedding into a long weekend."
    },
    {
      name: 'Camden Riverhouse',
      url: 'https://www.camdenmaine.com/',
      distance: '30 min from venue',
      note: 'Easy walk into downtown Camden, indoor pool, and a continental breakfast. Probably the best value if you want to stay in Camden.'
    },
    {
      name: 'Hotel 16 Bay View',
      url: 'https://16bayview.com/',
      distance: '30 min from venue',
      note: 'Sleek 21-room boutique in downtown Camden with one of the best rooftop bars on the coast. On the upscale side.'
    },
    {
      name: 'Lord Camden Inn',
      url: 'https://lordcamdeninn.com/',
      distance: '30 min from venue',
      note: 'Historic inn smack in the middle of Camden village, harbor views from many rooms, free breakfast. Solid mid-to-upper-range pick.'
    },
    {
      name: 'Hampton Inn & Suites Rockland',
      url: 'https://www.hilton.com/en/hotels/rkdmehx-hampton-suites-rockland/',
      distance: '25 min from venue',
      note: "You know what you're getting: indoor pool, free hot breakfast, free parking. Easily the best value if you want a familiar chain (and Hilton points)."
    },
    {
      name: 'Harborline Hotel',
      url: 'https://harborlinehotel.com/',
      distance: '30 min from venue',
      note: 'Recently renovated rooms in downtown Rockland, many with harbor views. Likely the cheapest option on this list at typical rates.'
    }
  ],
  // Things to do in Midcoast Maine — first item opens by default on the page
  thingsToDo: [
    {
      name: 'Owls Head State Park',
      tags: ['Outdoors', 'Kids', 'Scenic'],
      meta: 'Owls Head, ME · 20 min from Waldoboro',
      note: 'A short, easy trail winds through towering pines to a classic Maine lighthouse perched on a rocky cliff. The views over Penobscot Bay are unforgettable, especially in autumn when the islands go gold. Small rocky beach with picnic area below.'
    },
    {
      name: 'Hidden Valley Nature Center',
      tags: ['Outdoors', 'Kids'],
      meta: 'Jefferson, ME · 15 min from Waldoboro',
      note: 'A 1,000-acre preserve laced with quiet woodland trails, a pond loop, and a working sugar shack. Trail maps at the kiosk; bring bug spray in the early hours.'
    },
    {
      name: 'Quarry Hill Preserve',
      tags: ['Outdoors', 'Scenic'],
      meta: "Waldoboro, ME · 5 min from Tops'l",
      note: 'A short scramble up rough granite to an overlook with sweeping views of the Medomak River valley. Quick out-and-back; about 45 minutes round trip.'
    },
    {
      name: 'Coastal Maine Botanical Gardens',
      tags: ['Outdoors', 'Kids'],
      meta: 'Boothbay, ME · 40 min from Waldoboro',
      note: "300 acres of meticulously kept woodland gardens with a famously good kids' area — five enormous troll sculptures hidden along the paths. Plan two hours, more if it's warm."
    },
    {
      name: 'Farnsworth Art Museum',
      tags: ['Museum', 'World-Class'],
      meta: 'Rockland, ME · 30 min from Waldoboro',
      note: 'A small but extraordinary museum with the largest collection of Wyeth family paintings in the world. The cafe across the street does a very good lobster roll for lunch after.'
    }
  ],
  // FAQ items — both tiers share this baseline for now; the user will diverge them over time.
  faqBoth: [
    { title: 'What should I wear?', body: "Friday is garden-formal (think linen suits, long dresses, comfortable shoes — you'll be walking on grass and forest floor). Saturday is festive coastal — bring a sweater for after dark; October in Maine gets chilly once the sun is down." },
    { title: 'Can I bring a plus-one?', body: 'Your invitation envelope lists everyone we can fit; the RSVP form will let you confirm each guest by name. If someone is missing who should be there, just email us.' },
    { title: 'Will there be vegetarian / gluten-free options?', body: "Yes — there will be thoughtful vegetarian and gluten-free options at every meal. The RSVP form asks for any dietary restrictions; we'll pass everything to the kitchen." },
    { title: 'Is it kid-friendly?', body: "Yes! Kids are welcome at both days. Friday is more intimate and a bit quieter; Saturday is a loud, joyful party. There's plenty of farmland for them to run." },
    { title: 'What if I get there early?', body: "Check-in for cabins opens at 3:00 p.m. Friday. If you arrive earlier, leave bags at the main farmhouse and explore — there's a small swimming hole on the property and a herd of friendly goats." },
    { title: 'How do I get from the cabin to the ceremony?', body: "It's a five-minute walk along a lit path. Pack a flashlight (or use your phone) for the walk back after dark on Saturday." }
  ],
  faqDay2: [
    { title: 'What should I wear?', body: "Saturday is festive coastal — think linen, light layers, comfortable shoes for grass. Bring a sweater for after dark; October in Maine gets chilly once the sun is down." },
    { title: 'Can I bring a plus-one?', body: 'Your invitation envelope lists everyone we can fit; the RSVP form will let you confirm each guest by name. If someone is missing who should be there, just email us.' },
    { title: 'Will there be vegetarian / gluten-free options?', body: "Yes — there will be thoughtful vegetarian and gluten-free options. The RSVP form asks for any dietary restrictions; we'll pass everything to the kitchen." },
    { title: 'Is it kid-friendly?', body: "Yes! Kids are welcome. Saturday is a loud, joyful party with plenty of farmland for them to run." },
    { title: 'What if I get there early?', body: 'Saturday gates open at 4:30 p.m. If you arrive earlier, the main farmhouse has porches with rocking chairs and there are a few short trails on the property worth a wander.' },
    { title: 'Where should I park?', body: "Parking is on the farm in a marked grass field, a short walk from the celebration. Signage at the entrance will guide you in; we'll have helpers near the gate." }
  ]
};

// Admins can look themselves up and reach the admin dashboard.
// Keep this list short; match is case-insensitive on first or full name.
const ADMINS = ['Jess', 'Jeremy'];

const HOUSEHOLDS = [
  {
    // both + assigned cabin + UNPAID  →  invitation CTA, lodging page "Your Cabin"
    id: 'carroll',
    tier: 'both',
    adults: [
      { firstName: 'Margaret', lastName: 'Carroll', email: 'margaret.carroll@example.com' },
      { firstName: 'Daniel', lastName: 'Carroll', email: 'daniel.carroll@example.com' }
    ],
    children: ['Sophie', 'Theo'],
    plusOneAllowed: false,
    lodgeKey: 'top-a-frame',
    lodgingPaid: false
  },
  {
    // both + assigned room + PAID  →  invitation confirmed card
    id: 'pratt',
    tier: 'both',
    adults: [
      { firstName: 'Eleanor', lastName: 'Pratt', email: 'eleanor.pratt@example.com' },
      { firstName: 'James', lastName: 'Pratt', email: 'james.pratt@example.com' }
    ],
    children: [],
    plusOneAllowed: false,
    lodgeKey: 'longview1',
    lodgingPaid: true
  },
  {
    // both + NO lodging (the Betsy & Dustin case)  →  off-site list
    id: 'brennan',
    tier: 'both',
    adults: [
      { firstName: 'Rachel', lastName: 'Brennan', email: 'rachel.brennan@example.com' }
    ],
    children: [],
    plusOneAllowed: true,
    lodgeKey: '',
    lodgingPaid: false
  },
  {
    // both + assigned room + UNPAID  →  invitation CTA, lodging page "Your Room"
    id: 'okonkwo',
    tier: 'both',
    adults: [
      { firstName: 'David', lastName: 'Okonkwo', email: 'david.okonkwo@example.com' }
    ],
    children: [],
    plusOneAllowed: false,
    lodgeKey: 'top-cider-bed1',
    lodgingPaid: false
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

// Mock lodging catalog for demo mode — mirrors the Google Sheet "Room Specs" tab,
// keyed by lodge_key. In remote mode the Apps Script joins this in server-side and
// this constant is ignored. Images resolve to assets/lodging-images/{imageKey}1..3.webp.
const ROOM_SPECS = {
  'top-a-frame': {
    lodgeKey: 'top-a-frame',
    imageKey: 'aframe',
    venue: "Tops'l Farm Campground",
    room: 'Woodland A Frame Cabin',
    price: 498,
    checkIn: '3pm, Friday, October 2nd',
    checkOut: 'Noon, Sunday, October 4th',
    venueTeaser: "Glamping sites at Tops'l Farm are limited, so we've assigned one per household. Yours is a rustic A-frame cabin tucked in the woods — fresh linens, a private fire pit for s'mores, and a sky full of stars.",
    venueDescription: "Since 1936 Tops'l Farm has been a place where the most important connections are made, nurtured and celebrated; taking time out of the ordinary hustle and bustle to slow down, enjoy the unique flavor of mid-coast Maine, and to relax. The owners have taken great care to honor this heritage by creating new inspired spaces for the ultimate enjoyment of their farm, and we look forward to sharing it with you.",
    roomDescription: 'Cue instant relaxation. Step inside the fully furnished, rustic A-Frame cabins and allow yourself a few days to take things at a slower pace. The thoughtfully simplistic cabins have large windows into the woods, fresh linens, and plenty of creature comforts while you unplug. Each site includes two outdoor chairs and a private fire pit for your s\'mores sesh. The communal bathhouse is just steps away.',
    inclusions: [
      '2 twin beds per cabin (2 adults max)',
      '176 sq. ft. per cabin',
      'Bedding & linens, including towels',
      'Organic shampoo, conditioner & soap',
      'Battery-powered lantern',
      'Private fire pit, outdoor seating, board games',
      'Charcoal grills, electric kettle, potable water',
      'Communal use of all property amenities'
    ]
  },
  'longview1': {
    lodgeKey: 'longview1',
    imageKey: 'longview',
    venue: 'Long View Farm',
    room: 'Bedroom 1',
    price: 498,
    checkIn: '3pm, Friday, October 2nd',
    checkOut: 'Noon, Sunday, October 4th',
    venueTeaser: "To accommodate as many friends and relatives as possible, we've reserved and allocated rooms for guests. Your assigned room is at Long View Farm.",
    venueDescription: 'A beautifully sited farmhouse a short drive from the celebration, with open common spaces, a full kitchen, and long views over the fields. A relaxed home base for the weekend among family and friends.',
    roomDescription: 'A comfortable bedroom on the main level with a cozy, homey feel — fresh linens and towels provided.',
    inclusions: [
      'Bedding & linens, including towels',
      'Organic shampoo, conditioner & soap',
      'Full use of the shared kitchen & common spaces'
    ]
  },
  'top-cider-bed1': {
    lodgeKey: 'top-cider-bed1',
    imageKey: 'cider',
    venue: "Tops'l Farm Cider House",
    room: 'Bedroom 1 - King Bed w/ Attached Bath (first floor)',
    price: 498,
    checkIn: '3pm, Friday, October 2nd',
    checkOut: 'Noon, Sunday, October 4th',
    venueTeaser: "To accommodate as many friends and relatives as possible, we've reserved and allocated rooms for guests. Your assigned room is at the Tops'l Farm Cider House.",
    venueDescription: 'A lovingly restored cider house on the Tops\'l property, with a big shared kitchen and gathering space and several bedrooms — a warm, sociable place to stay steps from the celebration.',
    roomDescription: 'A first-floor bedroom with a king bed and an attached private bath — the most comfortable room in the house, with easy access to the common areas.',
    inclusions: [
      'King bed with attached private bath',
      'Bedding & linens, including towels',
      'Organic shampoo, conditioner & soap',
      'Full use of the shared kitchen & common spaces'
    ]
  }
};
