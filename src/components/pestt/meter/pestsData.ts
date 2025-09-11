
export type RiskLevel = 'high' | 'moderate' | 'low';

export interface Pest {
  name: string;
  months: string[];
  temperature: string;
  humidity: string;
  image: string;
  symptoms: string[];
  identification: string[];
  where: string;
  why: string;
  when: {
    high: string;
    moderate: string;
    low: string;
  };
  organic: string[];
  chemical: string[];
}

export const pestsData: Pest[] = [
  {
    name: "Early shoot borer",
    months: ["April", "May", "June", "July"],
    temperature: "28-32",
    humidity: "70-80",
    image: "/Image/Early-Shoot-Borer.jpg",
    symptoms: [
      "Dead heart seen in 1–3 month-old crop",
      "Caterpillar bores into the central shoot and eats inside",
      "Shoot becomes dry and can be easily pulled out",
      "Rotten part gives a bad smell",
      "Small holes appear near the base of the shoot"
    ],
    identification: [
      "Before pupating, the caterpillar makes a big hole in the stem",
      "It covers the hole with a silk-like layer"
    ],
    where: "Big hole in the stem",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Intercropping with daincha",
      "Granulosis virus spray 30gm/hectare as 0.1gm/litre",
      "Sturmiopsis inferens 1000–150 gravid females/hectare"
    ],
    chemical: [
      "Thiamethoxam 5–10 gm/15 litre water",
      "Chlorantraniliprole 60ml/acre in 200 litre water",
      "Fipronil 400–600ml/acre in 200 litre water"
    ]
  },
  {
    name: "Top shoot borer",
    months: ["January", "February", "March", "April"],
    temperature: "27-30",
    humidity: "75-85",
    image: "/Image/Early-Shoot-Borer.jpg",
    symptoms: [
      "Dead heart in young shoots",
      "Holes in stem near growing point",
      "Shoot becomes dry and can be pulled out"
    ],
    identification: [
      "Caterpillar bores into the central shoot",
      "Small holes near the growing point"
    ],
    where: "Central shoot near growing point",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Intercropping with daincha",
      "Granulosis virus spray 30gm/hectare"
    ],
    chemical: [
      "Thiamethoxam 5–10 gm/15 litre water",
      "Chlorantraniliprole 60ml/acre in 200 litre water"
    ]
  },
  {
    name: "Internode borer",
    months: ["October", "November", "December"],
    temperature: "30-35",
    humidity: "70-85",
    image: "/Image/Early-Shoot-Borer.jpg",
    symptoms: [
      "Holes in internodes",
      "Reduced cane quality",
      "Weakened stems"
    ],
    identification: [
      "Caterpillar bores into internodes",
      "Visible holes in stem"
    ],
    where: "Internodes of stem",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Trichogramma release 50,000/ha",
      "Neem oil spray"
    ],
    chemical: [
      "Chlorantraniliprole 60ml/acre",
      "Fipronil 400–600ml/acre"
    ]
  },
  {
    name: "Root borer",
    months: ["April", "May", "June", "July", "August", "September", "October"],
    temperature: "25-30",
    humidity: "75-90",
    image: "/Image/White Grub.jfif",
    symptoms: [
      "Yellowing and wilting of leaves",
      "Drying of entire crown",
      "Affected canes come off easily when pulled"
    ],
    identification: [
      "Grub found near roots",
      "Root damage visible"
    ],
    where: "Roots and base of stem",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Castor seed based traps 15–20 traps/acre",
      "Metarhizium anisopliae - 1–2 litre/acre"
    ],
    chemical: [
      "Quinalphos 25% EC soil application - 2 litre/acre"
    ]
  },
  {
    name: "Wireworms",
    months: ["May", "June", "July", "August", "September"],
    temperature: "26-30",
    humidity: "70-85",
    image: "/Image/White Grub.jfif",
    symptoms: [
      "Damage to underground parts",
      "Reduced plant stand",
      "Weakened root system"
    ],
    identification: [
      "Wire-like larvae in soil",
      "Damage to roots and underground stems"
    ],
    where: "Underground parts",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Crop rotation",
      "Soil solarization"
    ],
    chemical: [
      "Carbofuran 3G - 30kg/ha"
    ]
  },
  {
    name: "White grub",
    months: ["May", "June", "July", "August", "September"],
    temperature: "25-32",
    humidity: "80-90",
    image: "/Image/White Grub.jfif",
    symptoms: [
      "Yellowing and wilting of leaves",
      "Drying of entire crown",
      "Affected canes come off easily when pulled"
    ],
    identification: [
      "Grub - Fleshy 'C' shaped, whitish yellow in colour found close to the base of the clump"
    ],
    where: "Stem near soil",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Castor seed based traps 15–20 traps/acre",
      "Metarhizium anisopliae - 1–2 litre/acre in 200 litre water",
      "Beauveria bassiana - 2 litre/hectare in 200 litre water"
    ],
    chemical: [
      "Quinalphos 25% EC soil application - 2 litre/acre in 200–250 litre water"
    ]
  },
  {
    name: "Termites",
    months: ["September", "October", "November", "December", "January", "February", "March", "April", "May"],
    temperature: "30-38",
    humidity: "20-40",
    image: "/Image/White Grub.jfif",
    symptoms: [
      "Hollow stems",
      "Weakened plants",
      "Soil mounds around plants"
    ],
    identification: [
      "Termite mounds visible",
      "Hollow stems when cut"
    ],
    where: "Stems and roots",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Neem cake application",
      "Crop rotation"
    ],
    chemical: [
      "Chlorpyriphos 20%EC - 500ml/acre"
    ]
  },
  {
    name: "Rats",
    months: ["January", "February", "March", "November", "December"],
    temperature: "25-35",
    humidity: "40-60",
    image: "/Image/White Grub.jfif",
    symptoms: [
      "Cut stems near base",
      "Holes in field",
      "Damaged canes"
    ],
    identification: [
      "Rat holes visible",
      "Cut stems near ground level"
    ],
    where: "Base of stems",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Rat traps",
      "Crop protection measures"
    ],
    chemical: [
      "Zinc phosphide bait"
    ]
  },
  {
    name: "Whitefly",
    months: ["May", "June", "July", "August", "September", "October"],
    temperature: "30-35",
    humidity: "30-50",
    image: "/Image/Whitefly.jpg",
    symptoms: [
      "Yellowing of leaves and later it shows pale in colour",
      "Leaf turns pinkish or purple and later gradually dry",
      "Infested leaves look white and black dots"
    ],
    identification: [
      "White flies are present under the leaves"
    ],
    where: "Under the leaves",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Sticky traps 20 traps/acre"
    ],
    chemical: [
      "Chlorpyriphos 20%EC - 500ml/acre in 200–250 litre water",
      "Imidacloprid 17.8%SL - 1–2ml/litre"
    ]
  },
  {
    name: "Sugarcane woolly aphids",
    months: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ],
    temperature: "25-30",
    humidity: "75-85",
    image: "/Image/Wooly Aphids.jpg",
    symptoms: [
      "Large number of white coloured nymphs and adults on the under surface of leaf",
      "Yellowing and drying of leaves from the tip along the margins",
      "Leaves become brittle and dries completely",
      "Heavy secretion of honey dew leads to development of sooty mold",
      "Deposition of wooly matter on ground / soil distinctly visible"
    ],
    identification: [
      "Nymphs are yellowish white in colour with less powdery substance"
    ],
    where: "On leaves",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Azadirachtin 50,000 ppm - 1–1.5 litre/hectare in 200–250 litre water",
      "Ladybug beetles - 1000–2000 larvae/hectare"
    ],
    chemical: [
      "Chlorpyriphos 20%EC - 500ml/acre in 200 litre water",
      "Imidacloprid 17.8%SL - 1–2ml/litre"
    ]
  },
  {
    name: "Sugarcane pyrilla",
    months: ["February", "March"],
    temperature: "25-30",
    humidity: "70-80",
    image: "/Image/Whitefly.jpg",
    symptoms: [
      "Yellowing of leaves",
      "Sooty mold development",
      "Reduced photosynthesis"
    ],
    identification: [
      "Small insects on leaves",
      "Honeydew secretion"
    ],
    where: "On leaves",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Ladybug beetles release",
      "Neem oil spray"
    ],
    chemical: [
      "Imidacloprid 17.8%SL - 1–2ml/litre"
    ]
  },
  {
    name: "Mealy bug",
    months: ["March", "April", "May", "June", "July", "August", "September", "October"],
    temperature: "30-38",
    humidity: "30-50",
    image: "/Image/Whitefly.jpg",
    symptoms: [
      "White cottony masses on stems",
      "Yellowing of leaves",
      "Sooty mold development"
    ],
    identification: [
      "White cottony insects on stems",
      "Honeydew secretion"
    ],
    where: "On stems and leaves",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Ladybug beetles release",
      "Neem oil spray"
    ],
    chemical: [
      "Chlorpyriphos 20%EC - 500ml/acre",
      "Imidacloprid 17.8%SL - 1–2ml/litre"
    ]
  },
  {
    name: "Sugarcane scale insect",
    months: ["March", "April", "May", "June", "July", "August", "September", "October"],
    temperature: "28-32",
    humidity: "75-85",
    image: "/Image/Whitefly.jpg",
    symptoms: [
      "Scale-like insects on stems",
      "Yellowing of leaves",
      "Reduced growth"
    ],
    identification: [
      "Scale-like insects attached to stems",
      "Yellowing of affected parts"
    ],
    where: "On stems",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Neem oil spray",
      "Manual removal"
    ],
    chemical: [
      "Chlorpyriphos 20%EC - 500ml/acre"
    ]
  },
  {
    name: "Army worm",
    months: ["January", "February", "March", "April"],
    temperature: "27-32",
    humidity: "70-85",
    image: "/Image/White Grub.jfif",
    symptoms: [
      "Skeletonized leaves",
      "Defoliation",
      "Reduced plant vigor"
    ],
    identification: [
      "Caterpillars feeding on leaves",
      "Skeletonized leaf damage"
    ],
    where: "On leaves",
    why: "Due to climate",
    when: {
      high: "Present at the field",
      moderate: "In next 3–7 days",
      low: "In next 10–14 days"
    },
    organic: [
      "Neem oil spray",
      "Bacillus thuringiensis"
    ],
    chemical: [
      "Chlorpyriphos 20%EC - 500ml/acre",
      "Quinalphos 25%EC - 500ml/acre"
    ]
  }
];
