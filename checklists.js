// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Made by compliance.py from Checklists.xlsx – edit the spreadsheet, not this file. */
const CHECKLISTS = [
 {
  "key": "vehicle",
  "title": "Vehicle – daily walk-round check",
  "group": "Vehicles and trailers",
  "asset": "Registration",
  "fields": [
   "Mileage"
  ],
  "note": "Before the first journey of the day. The 'Working on the highway' items are aligned with Chapter 8 of the Traffic Signs Manual – check them against the current edition and the client's or highway authority's requirements.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Before driving",
    [
     "Tyres – tread depth legal, no cuts, bulges or exposed cord; pressures look right",
     "Wheel nuts – all present and tight; nut indicators (if fitted) not moved",
     "Lights – head, side, brake, indicators, hazards, reversing and number plate",
     "Mirrors, windscreen and windows – clean, set, no cracks in the driver's view",
     "Wipers and washers working; screenwash topped up",
     "Oil, coolant and brake fluid levels; no leaks under the vehicle",
     "Dashboard – no warning lights after starting",
     "Brakes and steering feel normal",
     "Horn works",
     "Seat belts – no cuts or fraying; buckles lock",
     "Number plates clean and readable",
     "Bodywork, doors and tailgate – secure, no sharp edges or loose panels",
     "Load and tools secured, within the payload; nothing loose in the cab",
     "Fuel / AdBlue enough for the day"
    ]
   ],
   [
    "Working on the highway (Chapter 8)",
    [
     "Rear high-visibility chevron markings – present, clean and undamaged",
     "Side and rear reflective markings – clean and undamaged",
     "Amber warning beacons / light bar – all working and visible all round",
     "Vehicle-mounted signs or arrow boards (if fitted) – working, correct legend",
     "Signs, cones and lamps – right type and number for the planned layout, clean, complete, with feet and sandbags",
     "High-visibility clothing in the vehicle for everyone in the crew",
     "Traffic management plan / layout and any permits or licences with the vehicle"
    ]
   ],
   [
    "Safety equipment",
    [
     "First-aid kit (and bleed-control kit) stocked and in date",
     "Fire extinguisher – in date, secured",
     "Spill kit carried when transporting fuel or oil",
     "Fuel cans – approved type, caps sealed, upright and secured",
     "Warning triangle, spare wheel or repair kit, jack",
     "Hand-washing water and soap; drinking water"
    ]
   ]
  ]
 },
 {
  "key": "trailer",
  "title": "Trailer – pre-tow check",
  "group": "Vehicles and trailers",
  "asset": "Trailer ID / serial no.",
  "fields": [
   "Towing vehicle registration",
   "Load carried"
  ],
  "note": "Every time the trailer is hitched up.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Coupling",
    [
     "Hitch fully down and locked on the towball; indicator (if fitted) showing locked",
     "Breakaway cable (braked trailer) or secondary coupling (unbraked) attached to a proper point on the vehicle",
     "Jockey wheel raised and clamped or stowed; corner steadies up",
     "Trailer handbrake released"
    ]
   ],
   [
    "Lights and electrics",
    [
     "Plug connected; cable not dragging or trapped",
     "Side, brake, indicator, fog and number plate lights all working",
     "Number plate matches the towing vehicle"
    ]
   ],
   [
    "Tyres, wheels and brakes",
    [
     "Tyres – tread, condition and pressures",
     "Wheel nuts all present and tight",
     "Brakes and overrun – work, no damage or leaks",
     "Spare wheel (if carried) usable"
    ]
   ],
   [
    "Body and load",
    [
     "Floor, sides, tailboard and ramps secure and pinned",
     "Load secured with straps / nets in good condition",
     "Load spread evenly; nose weight within the limits",
     "Within the trailer's plated weight and the vehicle's towing limit",
     "Mudguards secure",
     "Driver's licence covers this vehicle and trailer combination"
    ]
   ]
  ]
 },
 {
  "key": "chipper",
  "title": "Woodchipper – pre-use check",
  "group": "Plant and tools",
  "asset": "Make, model and fleet / serial no.",
  "fields": [
   "Hours"
  ],
  "note": "Before use each day, with the engine off and the key out unless the item says otherwise. Follow the manufacturer's handbook.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Set-up",
    [
     "On firm, level ground; handbrake on and wheels chocked; jockey wheel / stand set",
     "Exclusion zone set out with signs or barriers; public kept away from the infeed and discharge",
     "Discharge chute pointed away from people, roads and property, and locked"
    ]
   ],
   [
    "Machine – engine off, key out",
    [
     "Infeed hopper and tray – clear and undamaged",
     "Guards and covers all fitted and secure (belts, rollers, flywheel / drum)",
     "Blades and anvil – sharp, undamaged, bolts tight",
     "Fuel, engine oil and hydraulic oil levels; no leaks",
     "Hydraulic hoses and fittings – no damage or weeping",
     "Tyres, lights, number plate and coupling (see trailer check if towed)"
    ]
   ],
   [
    "Running checks",
    [
     "Starts and runs normally; no unusual noise or vibration",
     "Safety / control bar stops the feed rollers from every position – tested before feeding",
     "Emergency stop works",
     "Feed control forward / stop / reverse works"
    ]
   ],
   [
    "Operator",
    [
     "Operator trained and competent on this machine",
     "PPE – helmet with visor and ear defenders, close-fitting gloves, boots; no loose clothing or cuffs",
     "At least two people on site when chipping"
    ]
   ]
  ]
 },
 {
  "key": "stump",
  "title": "Stump grinder – pre-use check",
  "group": "Plant and tools",
  "asset": "Make, model and fleet / serial no.",
  "fields": [
   "Hours"
  ],
  "note": "Before use each day, with the engine off and the key out unless the item says otherwise. Follow the manufacturer's handbook.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Site",
    [
     "Underground services located (plans and cable locator) before grinding",
     "Stones, metal and debris cleared from around the stump",
     "Exclusion zone set out; debris guards / screens up where people or property are close"
    ]
   ],
   [
    "Machine – engine off, key out",
    [
     "Cutting wheel – all teeth present, sharp, pockets and bolts tight",
     "Guards, debris curtain and flaps fitted and undamaged",
     "Engine oil and fuel; no leaks",
     "Hydraulic hoses and fittings (if fitted) – no damage or leaks",
     "Belts / drive and their guards",
     "Wheels or tracks and their drive"
    ]
   ],
   [
    "Running checks",
    [
     "Operator presence (dead-man) control stops the cutting wheel",
     "Controls return to neutral when released",
     "Emergency stop works"
    ]
   ],
   [
    "Operator",
    [
     "Operator trained and competent on this machine",
     "PPE – visor or goggles, ear defenders, gloves, boots"
    ]
   ]
  ]
 },
 {
  "key": "chainsaw",
  "title": "Chainsaw – pre-use check",
  "group": "Plant and tools",
  "asset": "Make, model and serial no.",
  "fields": [],
  "note": "Before use each day and after any knock or fall.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Safety features",
    [
     "Chain brake works (front hand guard)",
     "Chain catcher present and undamaged",
     "Throttle lock-out / trigger interlock works",
     "On / off switch stops the engine",
     "Rear hand guard present",
     "Chain does not move at idle",
     "Anti-vibration mounts intact",
     "Exhaust / silencer secure; spark arrestor fitted"
    ]
   ],
   [
    "Cutting gear",
    [
     "Chain sharp, correctly tensioned and oiling",
     "Guide bar straight, rails not burred, oil hole clear",
     "Drive sprocket not worn"
    ]
   ],
   [
    "Fuel and PPE",
    [
     "Fuel and oil caps seal; no leaks",
     "PPE – chainsaw trousers or chaps, chainsaw boots, gloves, helmet with visor and ear defenders",
     "Top-handled saws used only in the tree by a trained climber"
    ]
   ]
  ]
 },
 {
  "key": "mewp",
  "title": "MEWP – operator's pre-use check",
  "group": "Lifting and access",
  "asset": "Make, model and fleet / serial no.",
  "fields": [
   "Hours",
   "Thorough examination due (date)"
  ],
  "note": "Before use each day by the trained operator. A MEWP lifts people, so its LOLER thorough examination is due at least every 6 months.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Paperwork",
    [
     "LOLER thorough examination in date (6-monthly); report or sticker seen",
     "Operator trained for this type of MEWP; operator's manual on the machine"
    ]
   ],
   [
    "Set-up",
    [
     "Ground assessed; outriggers / stabilisers on spreader pads; machine level",
     "Overhead lines checked; safe distance kept; line owner contacted if close",
     "Exclusion zone set out below the platform and around the machine"
    ]
   ],
   [
    "Machine",
    [
     "Platform, guardrails and entrance gate secure; gate closes",
     "Ground and platform controls work and return to neutral",
     "Emergency stops – ground and platform",
     "Emergency lowering works; ground person knows how to use it",
     "Tilt alarm and overload indicator working",
     "Hydraulic hoses and cylinders – no leaks or damage",
     "Tyres or tracks; boom and structure – no visible damage",
     "Safe working load plate and decals readable"
    ]
   ],
   [
    "People",
    [
     "Harness with a short work-restraint lanyard attached to the platform anchor",
     "Trained ground person present, with a rescue plan"
    ]
   ]
  ]
 },
 {
  "key": "climbing",
  "title": "Climbing and rigging kit – pre-use check",
  "group": "Lifting and access",
  "asset": "Kit set / owner",
  "fields": [
   "Thorough examination due (date)"
  ],
  "note": "Before each use by the climber. Equipment for lifting people and lifting accessories needs a LOLER thorough examination at least every 6 months; quarantine anything you're unsure of.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Paperwork",
    [
     "LOLER thorough examination in date (6-monthly); kit marked or identifiable"
    ]
   ],
   [
    "Personal kit",
    [
     "Harness – webbing, stitching, buckles, bridge and attachment points",
     "Climbing lines and lanyards – no cuts, glazing, contamination or core damage; terminations sound",
     "Karabiners and connectors – gates close and lock; no cracks, wear or corrosion",
     "Mechanical devices (rope wrench, hitch climber, ascenders, descenders) – work smoothly, pins secure, no wear",
     "Friction savers, pulleys and slings",
     "Helmet – shell, harness and chinstrap; within its service life"
    ]
   ],
   [
    "Rigging",
    [
     "Rigging lines, slings, blocks and lowering device – condition checked, safe working load marked",
     "Rigging kit suitable for the loads planned"
    ]
   ],
   [
    "Rescue",
    [
     "Aerial rescue kit ready on site",
     "A trained aerial rescuer on the ground",
     "Any doubtful item quarantined and recorded"
    ]
   ]
  ]
 },
 {
  "key": "drone",
  "title": "Drone – pre-flight check",
  "group": "Drone",
  "asset": "Drone (make, model, serial)",
  "fields": [
   "Flight location",
   "Batteries used"
  ],
  "note": "Before each flight. Check against the current CAA rules for your category of operation.",
  "team": false,
  "log": [
   "Take-off time",
   "Landing time",
   "Flight time (min)",
   "Max height (m)",
   "Flight issues or incidents"
  ],
  "sections": [
   [
    "Planning",
    [
     "Operator ID displayed on the drone; Flyer ID / competency certificate held",
     "Airspace checked (restrictions, airfields, temporary restrictions); permissions in place",
     "Weather and wind within limits; good visibility",
     "Take-off and landing area clear; uninvolved people and roads considered",
     "Landowner permission; privacy considered"
    ]
   ],
   [
    "Aircraft and controller",
    [
     "Propellers – undamaged and secure",
     "Batteries – charged, no swelling or damage; controller charged",
     "Firmware and app up to date; maps / mission loaded",
     "Return-to-home height set above the tallest trees and obstacles",
     "Camera and gimbal – free, lens clean, memory card in with space",
     "Compass and GPS OK (calibrate if prompted); enough satellites"
    ]
   ],
   [
    "Before take-off",
    [
     "Observer briefed (if used)",
     "Wildlife (nesting birds, livestock) not disturbed"
    ]
   ]
  ]
 },
 {
  "key": "drone_survey",
  "title": "Drone tree survey – field checklist (photography and photogrammetry)",
  "group": "Drone",
  "asset": "Drone (make, model, serial)",
  "fields": [
   "Site / job reference",
   "Purpose (photos / photogrammetry / inspection)"
  ],
  "note": "DJI Air 3S tree photography and 3DF Zephyr photogrammetry – use with the drone pre-flight check and the RAMS. Answer N/A to the photogrammetry items if you aren't making a model. In winter, leaf-off light shows the branch structure well. Fill in the flight log at the end.",
  "team": false,
  "log": [
   "Take-off time",
   "Landing time",
   "Number of flights",
   "Total flight time (min)",
   "Batteries used",
   "Max height (m)",
   "Weather and wind",
   "Trees / area flown",
   "Images backed up to",
   "Flight issues or incidents"
  ],
  "sections": [
   [
    "Before you fly",
    [
     "Operator ID and Flyer ID on the drone and in the Fly app",
     "Site checked for airspace restrictions, people, roads and private property",
     "Wind under about 15 mph (gusts matter), no rain",
     "Batteries charged, spare set packed, SD card cleared",
     "Props, gimbal and lens clean; polariser or ND filter fitted",
     "Rescue plan if the drone snags in a crown",
     "Risk assessment and permissions recorded"
    ]
   ],
   [
    "Camera – photography",
    [
     "RAW (DNG), manual exposure, ISO 100",
     "Shutter 1/500 s or faster to freeze leaf movement",
     "Apertures are fixed (wide f/1.8, 3x tele f/2.8) – exposure set with shutter speed and ISO",
     "Polariser to cut leaf glare and deepen greens (ND for video)",
     "Lens: 3x tele (70 mm) for layered woodland and distance – it can't focus closer than about 3 m; wide (24 mm) for context and close work",
     "Light: low sun at the start or end of the day for texture; flat midday light avoided where possible",
     "Dappled canopy: exposed for the highlights, shadows lifted later; bracketed (AEB) if the contrast is extreme"
    ]
   ],
   [
    "Camera – photogrammetry (3DF Zephyr)",
    [
     "Exposure manual and locked, so brightness is the same across the set",
     "Flat, overcast light (gives the cleanest models)",
     "12 MP is usually enough – 50 MP files are huge and slow to process",
     "Single tree: orbits at three heights (low, mid, above the crown), camera about 45°, 10–15° between shots, plus a few nadir shots",
     "Site grid: 80% front overlap, 70% side overlap",
     "Calm – moving leaves spoil a model more than anything else, so wait for the wind to drop"
    ]
   ],
   [
    "During the flight",
    [
     "Drone in visual line of sight and close to the tree",
     "Safe distance from branches – obstacle avoidance can miss thin twigs",
     "Manual control near the crown",
     "Mission planned on the ground first – flight time is limited",
     "Battery watched; returned with a safe reserve"
    ]
   ],
   [
    "After the flight",
    [
     "Cards backed up on site or the same day",
     "A sample of images checked for sharpness and exposure before leaving"
    ]
   ]
  ]
 },
 {
  "key": "site_ra",
  "title": "On-site risk assessment – tree work",
  "group": "Site",
  "asset": "Site",
  "fields": [
   "Client / job reference",
   "Work to be done",
   "Nearest A&E",
   "Emergency access point (grid ref / what3words)",
   "Phone signal",
   "First aider(s)",
   "Aerial rescuer(s)"
  ],
  "note": "Completed by the team leader on arrival, before work starts, with the RAMS for the job. Brief the team and get everyone to sign. Review it if anything changes.",
  "team": true,
  "log": [],
  "sections": [
   [
    "Public, property and access",
    [
     "Exclusion zones set out with signs / barriers; public and occupiers kept out",
     "Traffic management in place to the plan, with any permits or licences",
     "Buildings, vehicles and structures in the drop zone protected or moved",
     "Ground conditions, slopes and water – safe working and escape routes",
     "Livestock and dogs controlled or kept away"
    ]
   ],
   [
    "Services",
    [
     "Overhead power and telephone lines – distance checked; line owner contacted where work comes close",
     "Underground services located before stump grinding or digging"
    ]
   ],
   [
    "The trees and the work",
    [
     "Trees checked for decay, deadwood, hangers and weak unions that affect climbing, rigging or felling",
     "Wind and weather OK for the work",
     "Felling – direction, drop zone and escape routes clear",
     "Climbing – anchor point assessed and tested; climber secured by two points when using a chainsaw",
     "Rigging – anchor and lowering points assessed; loads within the kit's working load",
     "MEWP – ground and set-up checked (see MEWP pre-use check)",
     "Chipper and stump grinder – position, discharge direction and exclusion zones (see pre-use checks)"
    ]
   ],
   [
    "Wildlife and consents",
    [
     "Nesting birds checked; work stopped or changed if active nests found",
     "Bats – roost features checked; stop and get advice if bats are found",
     "Other protected species (e.g. badger setts) checked",
     "TPO, conservation area, felling licence or planning condition – consent in place"
    ]
   ],
   [
    "People and welfare",
    [
     "Team trained and certificated for their tasks; tickets seen",
     "PPE correct and in good condition",
     "Aerial rescue plan in place; rescuer and kit on site when climbing",
     "First-aid kit (with bleed-control kit) and a first aider on site",
     "Hand washing and drinking water available",
     "Fuel and oil stored safely; spill kit on site",
     "Noise and vibration – hearing protection worn; vibration exposure managed",
     "Lone working – check-in arranged"
    ]
   ]
  ]
 },
 {
  "key": "ladder",
  "title": "Ladder / stepladder – pre-use check",
  "group": "Lifting and access",
  "asset": "Ladder ID / serial no.",
  "fields": [],
  "note": "Every time, before use. Ladders are for short-duration, light work only; a detailed inspection is recorded at least every 12 months.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Ladder",
    [
     "Stiles straight – not bent, split, cracked, dented or corroded",
     "Rungs / treads – none bent, loose, missing, worn or slippery",
     "Feet – all present, not worn or split, clean",
     "Locking bars, stays and hinges work and lock (stepladders)",
     "Clean – no mud, grease, paint or sap; labels and EN 131 marking legible",
     "No unauthorised repairs; within its detailed inspection date"
    ]
   ],
   [
    "Setting up",
    [
     "Firm, level ground; angle about 1 in 4 (75°); top resting on something solid",
     "Tied, stabilised or footed; not against a branch or anything that could move",
     "Short-duration light work only; three points of contact; no overreaching"
    ]
   ]
  ]
 },
 {
  "key": "insulated",
  "title": "Insulated tools (utility / rail work) – pre-use check",
  "group": "Plant and tools",
  "asset": "Tool set / serial nos.",
  "fields": [
   "Voltage / work rating",
   "Electrical test due (date)"
  ],
  "note": "Before each use near overhead lines or rail equipment. Only competent, authorised people use them, under the network operator's rules and permits. If in any doubt – quarantine it.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Tool",
    [
     "Within its electrical test date (label / record)",
     "Insulation clean and dry – no mud, sap, grease, moisture or contamination",
     "No cuts, cracks, chips, burns, delamination or tracking marks on the insulation",
     "Hydrophobic finish / gloss intact where fitted",
     "Joints, couplings and locking collars secure; sections not loose",
     "Heads, saws and blades secure, sharp and undamaged",
     "Correct tool and rating for the voltage and the work"
    ]
   ],
   [
    "Use",
    [
     "Permit / authorisation and safe distances confirmed with the network operator",
     "Stored and carried in its bag or tube; wiped with the recommended cloth before use"
    ]
   ]
  ]
 },
 {
  "key": "lifejacket",
  "title": "Lifejacket – pre-use check",
  "group": "Water",
  "asset": "Lifejacket ID / serial no.",
  "fields": [
   "Service due (date)"
  ],
  "note": "Before any work on or next to water, or from a boat. Inspected every 6 months and serviced (cylinder / firing head) every 12 months.",
  "team": false,
  "log": [],
  "sections": [
   [
    "Lifejacket",
    [
     "Within its service date (label)",
     "Gas cylinder screwed in hand-tight, correct size, not corroded or pierced",
     "Auto-firing head / cartridge in date and indicators green",
     "Oral inflation tube and cap present and working",
     "Cover, webbing, buckles and crotch strap undamaged",
     "Light (battery in date), whistle and reflective tape present"
    ]
   ],
   [
    "Wearing",
    [
     "Worn outside other clothing, fastened, adjusted and crotch strap fitted",
     "Spray hood fitted if needed"
    ]
   ]
  ]
 },
 {
  "key": "rpe",
  "title": "Respirator (RPE) – pre-use check",
  "group": "PPE",
  "asset": "Respirator make, model and ID",
  "fields": [
   "Filter type and date fitted"
  ],
  "note": "Before each use. Reusable RPE also needs a recorded thorough examination at least monthly (no more than 3-monthly if used only occasionally).",
  "team": false,
  "log": [],
  "sections": [
   [
    "Respirator",
    [
     "Right type and protection for the job (as the COSHH assessment / RAMS)",
     "Face-fit tested to this make, model and size",
     "Clean-shaven where the seal sits",
     "Facepiece, straps, valves and seals undamaged; valves seat correctly",
     "Filters the right type, in date and not used up",
     "Powered RPE: battery charged, airflow indicator OK",
     "Fit check passed (positive / negative pressure) after putting it on",
     "Cleaned and stored sealed after use"
    ]
   ]
  ]
 },
 {
  "key": "rope_access",
  "title": "Rope access (IRATA) – team and site check",
  "group": "Lifting and access",
  "asset": "Site / work position",
  "fields": [
   "Level 3 supervisor",
   "IRATA numbers of the team"
  ],
  "note": "Before rope access work starts each day, led by the IRATA Level 3 supervisor. Equipment detailed inspection at least every 6 months; interim inspections where the risk assessment calls for them.",
  "team": true,
  "log": [],
  "sections": [
   [
    "Team",
    [
     "IRATA Level 3 supervisor on site and in charge throughout",
     "Every technician's IRATA certification valid; logbooks checked; on ropes within the last 6 months",
     "At least two technicians; rescue plan agreed and everyone knows their role",
     "First-aider on site; emergency services details and access point known"
    ]
   ],
   [
    "Equipment",
    [
     "Harness, descender, back-up device, ascenders, cow's tails and connectors pre-use checked and buddy-checked",
     "All personal kit within its detailed (6-monthly) inspection; nothing quarantined in use",
     "Ropes checked – no cuts, glazing, contamination or core damage; correct length with stopper knots",
     "Rescue kit rigged or ready at the work position"
    ]
   ],
   [
    "Rigging",
    [
     "Two independent anchors and ropes (working and back-up) for each technician; anchors assessed",
     "Edge protection and re-directions fitted at every rub point"
    ]
   ],
   [
    "Site",
    [
     "Exclusion zone below barriered and signed; ground person if the public could enter",
     "Tools tethered; helmets with chinstraps for everyone in the zone",
     "Weather within the limits in the method statement; radios / communication tested",
     "Permits from the client or network operator in place where required"
    ]
   ]
  ]
 }
];
