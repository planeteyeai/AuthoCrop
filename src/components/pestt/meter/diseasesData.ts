export const diseasesData = [
  {
    name: "Red Rot",
    months: ["July", "August", "September", "October", "November"],
    symptoms: [
      "Leaf changes colour from green to yellow, then drying from bottom to top.",
      "Red spots on the back side of the midrib if spores enter through the leaf.",
      "Visible symptoms 16-21 days after infection; cane dries up in 10 days.",
      "Inside cane: reddish with white streaks, sometimes blackish-brown liquid with alcohol smell."
    ],
    organic: ["Trichoderma -5kg/acre with 100 kg farm yard manure"],
    chemical: ["Carbendazim-500–1000gm/acre in 200–400 litre water, through drip irrigation"],
    conditions: [
      {
        temperatureRange: "25.00°C–30.00°C",
        humidityRange: "80%–90%"
      },
      {
        temperatureRange: "28.00°C–34.00°C",
        humidityRange: "50%–65%"
      }
    ],
    image: "/Image/red_rot.jpg"
  },
  {
    name: "Smut",
    months: ["February", "March", "April", "May", "June"],
    symptoms: [
      "Long whip-like structure (25–150 cm) from cane top, silvery layer, black powdery spores.",
      "Cane grows tall, then shortens."
    ],
    organic: ["Trichoderma - 5kg/acre with 100 kg farm yard manure"],
    chemical: [ "Dip setts in Carbendazim 0.1% as -1gm/litre of water", "OR Tradimefon 0.005% as - 0.5gm/litre of water, for 30 min before planting"],
    conditions: [
      {
        temperatureRange: "25.00°C–30.00°C",
        humidityRange: "75%–85%"
      }
    ],
    image: "/Image/smut.jpg"
  },
  {
    name: "Grassy Shoot",
    months: ["February", "March", "April", "May"],
    symptoms: [
      "Thin, white papery leaves at cane top in 3–4 month old crops.",
      "Many white/yellow shoots from below these leaves.",
      "Short cane, small gaps between nodes, side buds grow.",
      "Usually in isolated clumps."
    ],
    organic: ["Dip setts in Trichoderma viridae or Pseudomonas fluorescens before planting -10 gms/litre of water"],
    chemical: ["Dip setts in Tetracycline hydrochloride (250 ppm) for 3–4 hrs", "Spray Imidacloprid 17.8% at 0.5ml/litre"],
    conditions: [
      {
        temperatureRange: "30.00°C–35.00°C",
        humidityRange: "65%–75%"
      }
    ],
    image: "/Image/grassy_shoot.png"
  },
  {
    name: "Wilt",
    months: ["July", "August", "September", "October"],
    symptoms: [
      "Appears at 4–5 months old.",
      "Leaves turn yellow and dry, canes weak and shrink.",
      "Inside cane: center turns purple/brown with holes, bad smell, white cotton-like fungus."
    ],
    organic: ["Trichoderma 5kg/acre with 100kg farm yard manure"],
    chemical: ["Dip setts in Carbendazim 0.1% at 1gm/litre for 30 mins","Apply Carbendazim 1kg/acre with compost manure"],
    conditions: [
      {
        temperatureRange: "30.00°C–35.00°C",
        humidityRange: "65%–75%"
      }
    ],
    image: "/Image/wilt.png"
  },
  {
    name: "Ratoon Stunting Disease (RSD)",
    months: ["February", "March", "April", "May", "June", "July", "August", "September", "October", "November"],
    symptoms: [
      "Stunted growth of ratoon crop",
      "Reduced tillering",
      "Short internodes",
      "Yellowing of leaves"
    ],
    organic: ["Use healthy seed material", "Crop rotation"],
    chemical: ["Hot water treatment of setts at 50°C for 2 hours"],
    conditions: [
      {
        temperatureRange: "30.00°C–38.00°C",
        humidityRange: "60%–70%"
      }
    ],
    image: "/Image/wilt.png"
  },
  {
    name: "Leaf Scald",
    months: ["March", "April", "May", "June", "July", "August"],
    symptoms: [
      "White to yellow stripes on leaves",
      "Leaf tip necrosis",
      "Reddish-brown lesions on leaves"
    ],
    organic: ["Use resistant varieties", "Remove infected plants"],
    chemical: ["Streptomycin sulfate 0.1% spray"],
    conditions: [
      {
        temperatureRange: "30.00°C–35.00°C",
        humidityRange: "70%–80%"
      }
    ],
    image: "/Image/wilt.png"
  },
  {
    name: "Rust",
    months: ["August", "September", "October", "November", "December"],
    symptoms: [
      "Small, reddish-brown pustules on leaves",
      "Yellowing and premature death of leaves",
      "Reduced photosynthesis"
    ],
    organic: ["Use resistant varieties", "Proper spacing"],
    chemical: ["Mancozeb 0.25% spray"],
    conditions: [
      {
        temperatureRange: "20.00°C–25.00°C",
        humidityRange: "85%–95%"
      }
    ],
    image: "/Image/wilt.png"
  }
];
