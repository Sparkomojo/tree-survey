// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Made by quote_visit.py from Resources_Library.xlsx – edit the spreadsheet, not this file. */
const RESOURCES = {
 "crew": [
  "Climber",
  "Climber - rigging / dismantling",
  "Groundsperson - aerial rescuer",
  "Groundsperson",
  "Chainsaw operator - felling up to 380 mm",
  "Chainsaw operator - felling over 380 mm",
  "MEWP operator - chainsaw from a platform",
  "Chipper operator",
  "Stump grinder operator",
  "Hedge cutting operative",
  "Traffic management operative",
  "Slinger / signaller",
  "Team leader / supervisor",
  "Mower operator - ride-on",
  "Mower operator - pedestrian",
  "Strimmer / brushcutter operator",
  "Pesticide operator - hand-held",
  "Tractor / flail operator",
  "Grounds maintenance operative",
  "Landscaper - hard landscaping",
  "Landscaper - soft landscaping",
  "Groundworker",
  "Excavator operator",
  "Dumper operator",
  "Bricklayer / waller",
  "Fencer",
  "Carpenter / decking installer",
  "Labourer"
 ],
 "plant": [
  "Crew vehicle (4x4 / pickup)",
  "Vehicle and trailer",
  "Tipper / chip truck",
  "Woodchipper",
  "Stump grinder",
  "MEWP - tracked spider lift",
  "MEWP - vehicle mounted",
  "Tracked dumper / timber carrier",
  "Mini digger / grab",
  "Log splitter",
  "Crane (contract lift, with operator)",
  "Chapter 8 vehicle (beacons, chevrons)",
  "Welfare unit",
  "Ride-on mower",
  "Pedestrian mower",
  "Remote-controlled slope mower",
  "Tractor with flail / verge mower",
  "Salt spreader (towed)",
  "Excavator (1.5 - 3 t)",
  "Excavator (5 - 8 t)",
  "Site dumper",
  "Roller (pedestrian / ride-on)",
  "Turf cutter",
  "Rotavator"
 ],
 "equipment": [
  [
   "Chainsaws and cutting",
   "Top-handled chainsaw"
  ],
  [
   "Chainsaws and cutting",
   "Rear-handled chainsaw (small)"
  ],
  [
   "Chainsaws and cutting",
   "Rear-handled chainsaw (large bar)"
  ],
  [
   "Chainsaws and cutting",
   "Pole saw (powered)"
  ],
  [
   "Chainsaws and cutting",
   "Handsaws and secateurs"
  ],
  [
   "Chainsaws and cutting",
   "Hedge trimmer"
  ],
  [
   "Chainsaws and cutting",
   "Long-reach hedge trimmer"
  ],
  [
   "Chainsaws and cutting",
   "Brushcutter / clearing saw"
  ],
  [
   "Chainsaws and cutting",
   "Chainsaw fuel, oil and spares"
  ],
  [
   "Climbing and rescue",
   "Climbing kit - two-rope system (per climber)"
  ],
  [
   "Climbing and rescue",
   "Aerial rescue kit (ground)"
  ],
  [
   "Climbing and rescue",
   "Throw line kit"
  ],
  [
   "Climbing and rescue",
   "Climbing spikes (removals only)"
  ],
  [
   "Rigging and lowering",
   "Rigging rope"
  ],
  [
   "Rigging and lowering",
   "Friction device (Port-a-wrap / GRCS)"
  ],
  [
   "Rigging and lowering",
   "Rigging blocks and pulleys"
  ],
  [
   "Rigging and lowering",
   "Slings and strops"
  ],
  [
   "Felling",
   "Felling wedges"
  ],
  [
   "Felling",
   "Felling lever / breaking bar"
  ],
  [
   "Felling",
   "Hand winch and strops"
  ],
  [
   "Felling",
   "Pull line"
  ],
  [
   "Site and safety",
   "Barriers and warning signs"
  ],
  [
   "Site and safety",
   "Chapter 8 signs, cones and lamps"
  ],
  [
   "Site and safety",
   "Stop / Go boards"
  ],
  [
   "Site and safety",
   "Ground protection mats"
  ],
  [
   "Site and safety",
   "Tarpaulins and rakes"
  ],
  [
   "Site and safety",
   "Leaf blower"
  ],
  [
   "Site and safety",
   "Cable avoidance tool (CAT) and genny"
  ],
  [
   "Site and safety",
   "Debris screens"
  ],
  [
   "Site and safety",
   "Spill kit"
  ],
  [
   "Site and safety",
   "Fire extinguisher"
  ],
  [
   "First aid and welfare",
   "First aid kit with catastrophic bleed kit"
  ],
  [
   "First aid and welfare",
   "Welfare - hand washing and drinking water"
  ],
  [
   "First aid and welfare",
   "Phones / radios"
  ],
  [
   "Grounds maintenance",
   "Line trimmer / strimmer"
  ],
  [
   "Grounds maintenance",
   "Knapsack sprayer"
  ],
  [
   "Grounds maintenance",
   "Pesticide spill kit and lockable chest"
  ],
  [
   "Grounds maintenance",
   "Litter pickers and sharps box"
  ],
  [
   "Grounds maintenance",
   "Leaf vacuum"
  ],
  [
   "Grounds maintenance",
   "Hand tools (spades, forks, hoes, shears)"
  ],
  [
   "Grounds maintenance",
   "Pusher shovels and ice grips"
  ],
  [
   "Landscaping",
   "Plate compactor"
  ],
  [
   "Landscaping",
   "Cut-off saw with water suppression"
  ],
  [
   "Landscaping",
   "Block splitter"
  ],
  [
   "Landscaping",
   "Breaker (electric / hydraulic)"
  ],
  [
   "Landscaping",
   "Cement mixer"
  ],
  [
   "Landscaping",
   "Slab / kerb lifter"
  ],
  [
   "Landscaping",
   "Laser level and staff"
  ],
  [
   "Landscaping",
   "Barrows, shovels, rakes and trowels"
  ],
  [
   "Landscaping",
   "Post hole digger / auger"
  ],
  [
   "Landscaping",
   "Post driver"
  ],
  [
   "Landscaping",
   "Saws, drills and nail gun (carpentry)"
  ],
  [
   "Landscaping",
   "110 V transformer and leads"
  ],
  [
   "Landscaping",
   "Trench covers and fencing"
  ],
  [
   "Landscaping",
   "Laying boards, lutes and roller (turf)"
  ]
 ],
 "works": [
  {
   "key": "fell_small",
   "name": "Fell small trees (up to 380 mm)",
   "crew": [
    [
     "Chainsaw operator - felling up to 380 mm",
     1
    ],
    [
     "Groundsperson",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Rear-handled chainsaw (small)",
    "Felling wedges",
    "Felling lever / breaking bar"
   ]
  },
  {
   "key": "fell_large",
   "name": "Fell larger trees (over 380 mm)",
   "crew": [
    [
     "Chainsaw operator - felling over 380 mm",
     1
    ],
    [
     "Groundsperson",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Rear-handled chainsaw (large bar)",
    "Felling wedges",
    "Felling lever / breaking bar",
    "Hand winch and strops",
    "Pull line"
   ]
  },
  {
   "key": "dismantle",
   "name": "Section fell / dismantle by climbing",
   "crew": [
    [
     "Climber - rigging / dismantling",
     1
    ],
    [
     "Groundsperson - aerial rescuer",
     1
    ],
    [
     "Groundsperson",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)",
    "Woodchipper"
   ],
   "equipment": [
    "Climbing kit - two-rope system (per climber)",
    "Aerial rescue kit (ground)",
    "Throw line kit",
    "Climbing spikes (removals only)",
    "Top-handled chainsaw",
    "Rear-handled chainsaw (large bar)",
    "Rigging rope",
    "Friction device (Port-a-wrap / GRCS)",
    "Rigging blocks and pulleys",
    "Slings and strops"
   ]
  },
  {
   "key": "prune_climb",
   "name": "Prune / reduce by climbing",
   "crew": [
    [
     "Climber",
     1
    ],
    [
     "Groundsperson - aerial rescuer",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)",
    "Woodchipper"
   ],
   "equipment": [
    "Climbing kit - two-rope system (per climber)",
    "Aerial rescue kit (ground)",
    "Throw line kit",
    "Top-handled chainsaw",
    "Handsaws and secateurs",
    "Pole saw (powered)",
    "Rigging rope",
    "Friction device (Port-a-wrap / GRCS)",
    "Slings and strops"
   ]
  },
  {
   "key": "mewp",
   "name": "Prune / dismantle from a MEWP",
   "crew": [
    [
     "MEWP operator - chainsaw from a platform",
     1
    ],
    [
     "Groundsperson",
     1
    ]
   ],
   "plant": [
    "MEWP - tracked spider lift"
   ],
   "equipment": [
    "Top-handled chainsaw",
    "Rigging rope",
    "Friction device (Port-a-wrap / GRCS)",
    "Slings and strops",
    "Ground protection mats"
   ]
  },
  {
   "key": "ground_prune",
   "name": "Crown lift / deadwood from the ground",
   "crew": [
    [
     "Chainsaw operator - felling up to 380 mm",
     1
    ],
    [
     "Groundsperson",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Pole saw (powered)",
    "Handsaws and secateurs",
    "Rear-handled chainsaw (small)"
   ]
  },
  {
   "key": "hedge",
   "name": "Hedge cutting / trimming",
   "crew": [
    [
     "Hedge cutting operative",
     1
    ],
    [
     "Groundsperson",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Hedge trimmer",
    "Long-reach hedge trimmer",
    "Tarpaulins and rakes",
    "Leaf blower"
   ]
  },
  {
   "key": "clearance",
   "name": "Scrub and undergrowth clearance",
   "crew": [
    [
     "Groundsperson",
     2
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Brushcutter / clearing saw",
    "Tarpaulins and rakes"
   ]
  },
  {
   "key": "chip",
   "name": "Chip brash on site",
   "crew": [
    [
     "Chipper operator",
     1
    ]
   ],
   "plant": [
    "Woodchipper"
   ],
   "equipment": [
    "Tarpaulins and rakes"
   ]
  },
  {
   "key": "stump",
   "name": "Stump grinding",
   "crew": [
    [
     "Stump grinder operator",
     1
    ]
   ],
   "plant": [
    "Stump grinder"
   ],
   "equipment": [
    "Cable avoidance tool (CAT) and genny",
    "Debris screens",
    "Tarpaulins and rakes"
   ]
  },
  {
   "key": "road",
   "name": "Work on or next to a road",
   "crew": [
    [
     "Traffic management operative",
     1
    ]
   ],
   "plant": [
    "Chapter 8 vehicle (beacons, chevrons)"
   ],
   "equipment": [
    "Chapter 8 signs, cones and lamps",
    "Stop / Go boards"
   ]
  },
  {
   "key": "crane",
   "name": "Crane-assisted dismantle",
   "crew": [
    [
     "Climber - rigging / dismantling",
     1
    ],
    [
     "Groundsperson - aerial rescuer",
     1
    ],
    [
     "Slinger / signaller",
     1
    ]
   ],
   "plant": [
    "Crane (contract lift, with operator)"
   ],
   "equipment": [
    "Climbing kit - two-rope system (per climber)",
    "Aerial rescue kit (ground)",
    "Top-handled chainsaw",
    "Slings and strops"
   ]
  },
  {
   "key": "removal",
   "name": "Take the arisings away",
   "crew": [],
   "plant": [
    "Tipper / chip truck"
   ],
   "equipment": [
    "Tarpaulins and rakes",
    "Ground protection mats"
   ]
  },
  {
   "key": "logs",
   "name": "Cut and stack logs on site",
   "crew": [
    [
     "Groundsperson",
     1
    ]
   ],
   "plant": [
    "Log splitter"
   ],
   "equipment": [
    "Rear-handled chainsaw (small)"
   ]
  },
  {
   "key": "gm_mow",
   "name": "Grass cutting",
   "crew": [
    [
     "Mower operator - ride-on",
     1
    ],
    [
     "Grounds maintenance operative",
     1
    ]
   ],
   "plant": [
    "Vehicle and trailer",
    "Ride-on mower",
    "Pedestrian mower"
   ],
   "equipment": [
    "Line trimmer / strimmer",
    "Leaf blower",
    "Barriers and warning signs"
   ]
  },
  {
   "key": "gm_strim",
   "name": "Strimming / brushcutting",
   "crew": [
    [
     "Strimmer / brushcutter operator",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Line trimmer / strimmer",
    "Brushcutter / clearing saw",
    "Barriers and warning signs"
   ]
  },
  {
   "key": "gm_flail",
   "name": "Verge / hedge flailing",
   "crew": [
    [
     "Tractor / flail operator",
     1
    ],
    [
     "Traffic management operative",
     1
    ]
   ],
   "plant": [
    "Tractor with flail / verge mower",
    "Chapter 8 vehicle (beacons, chevrons)"
   ],
   "equipment": [
    "Chapter 8 signs, cones and lamps"
   ]
  },
  {
   "key": "gm_herbicide",
   "name": "Herbicide application",
   "crew": [
    [
     "Pesticide operator - hand-held",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Knapsack sprayer",
    "Pesticide spill kit and lockable chest",
    "Barriers and warning signs"
   ]
  },
  {
   "key": "gm_leaves",
   "name": "Leaf clearance",
   "crew": [
    [
     "Grounds maintenance operative",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Leaf blower",
    "Leaf vacuum",
    "Tarpaulins and rakes"
   ]
  },
  {
   "key": "gm_litter",
   "name": "Litter picking",
   "crew": [
    [
     "Grounds maintenance operative",
     1
    ]
   ],
   "plant": [],
   "equipment": [
    "Litter pickers and sharps box"
   ]
  },
  {
   "key": "gm_beds",
   "name": "Shrub beds, planting and mulching",
   "crew": [
    [
     "Grounds maintenance operative",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Hand tools (spades, forks, hoes, shears)",
    "Handsaws and secateurs"
   ]
  },
  {
   "key": "gm_grit",
   "name": "Gritting and snow clearance",
   "crew": [
    [
     "Grounds maintenance operative",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)",
    "Salt spreader (towed)"
   ],
   "equipment": [
    "Pusher shovels and ice grips"
   ]
  },
  {
   "key": "ls_excavate",
   "name": "Site clearance, excavation and levels",
   "crew": [
    [
     "Excavator operator",
     1
    ],
    [
     "Groundworker",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)",
    "Excavator (1.5 - 3 t)",
    "Site dumper"
   ],
   "equipment": [
    "Cable avoidance tool (CAT) and genny",
    "Laser level and staff",
    "Barrows, shovels, rakes and trowels",
    "Trench covers and fencing"
   ]
  },
  {
   "key": "ls_paving",
   "name": "Paving, patios, paths and drives",
   "crew": [
    [
     "Landscaper - hard landscaping",
     2
    ],
    [
     "Labourer",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Plate compactor",
    "Cut-off saw with water suppression",
    "Block splitter",
    "Cement mixer",
    "Slab / kerb lifter",
    "Laser level and staff",
    "Barrows, shovels, rakes and trowels"
   ]
  },
  {
   "key": "ls_concrete",
   "name": "Concrete bases and footings",
   "crew": [
    [
     "Groundworker",
     1
    ],
    [
     "Labourer",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Cement mixer",
    "Laser level and staff",
    "Barrows, shovels, rakes and trowels"
   ]
  },
  {
   "key": "ls_walls",
   "name": "Walls, retaining walls and steps",
   "crew": [
    [
     "Bricklayer / waller",
     1
    ],
    [
     "Labourer",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Cement mixer",
    "Cut-off saw with water suppression",
    "Block splitter",
    "Barrows, shovels, rakes and trowels"
   ]
  },
  {
   "key": "ls_fencing",
   "name": "Fencing and gates",
   "crew": [
    [
     "Fencer",
     1
    ],
    [
     "Labourer",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Cable avoidance tool (CAT) and genny",
    "Post hole digger / auger",
    "Post driver",
    "Cement mixer",
    "Saws, drills and nail gun (carpentry)"
   ]
  },
  {
   "key": "ls_decking",
   "name": "Decking, pergolas and timber structures",
   "crew": [
    [
     "Carpenter / decking installer",
     1
    ],
    [
     "Labourer",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Saws, drills and nail gun (carpentry)",
    "Post hole digger / auger",
    "110 V transformer and leads"
   ]
  },
  {
   "key": "ls_drainage",
   "name": "Drainage, soakaways and trenches",
   "crew": [
    [
     "Excavator operator",
     1
    ],
    [
     "Groundworker",
     1
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)",
    "Excavator (1.5 - 3 t)"
   ],
   "equipment": [
    "Cable avoidance tool (CAT) and genny",
    "Laser level and staff",
    "Trench covers and fencing",
    "Barrows, shovels, rakes and trowels"
   ]
  },
  {
   "key": "ls_turf",
   "name": "Topsoil, turfing and seeding",
   "crew": [
    [
     "Landscaper - soft landscaping",
     2
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Laying boards, lutes and roller (turf)",
    "Barrows, shovels, rakes and trowels"
   ]
  },
  {
   "key": "ls_planting",
   "name": "Planting schemes and tree planting",
   "crew": [
    [
     "Landscaper - soft landscaping",
     2
    ]
   ],
   "plant": [
    "Crew vehicle (4x4 / pickup)"
   ],
   "equipment": [
    "Cable avoidance tool (CAT) and genny",
    "Post driver",
    "Hand tools (spades, forks, hoes, shears)"
   ]
  }
 ],
 "basic": [
  "Barriers and warning signs",
  "Chainsaw fuel, oil and spares",
  "First aid kit with catastrophic bleed kit",
  "Spill kit",
  "Phones / radios"
 ]
};
