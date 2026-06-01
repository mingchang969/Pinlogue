export const colorOptions = [
  { value: "R", color: "#EE517B" },
  { value: "O", color: "#FF9074" },
  { value: "Y", color: "#FFCE74" },
  { value: "G", color: "#BEC94A" },
  { value: "B", color: "#5DC2F4" },
  { value: "P", color: "#AE86FF" },
  { value: "Gr", color: "#8D8D8D" },
  { value: "Br", color: "#9B4E35" },
];

export const iconOptions = [
  { value: "love", icon: "bi bi-heart-fill" },
  { value: "hot", icon: "bi bi-fire" },
  { value: "food", icon: "bi bi-fork-knife" },
  { value: "cafe", icon: "bi bi-cup-hot-fill" },
  { value: "tree", icon: "bi bi-tree-fill" },
  { value: "flower", icon: "bi bi-flower1" },
  { value: "snow", icon: "bi bi-snow" },
  { value: "signpost", icon: "bi bi-signpost-fill" },
  { value: "backpack", icon: "bi bi-backpack2-fill" },
  { value: "bag", icon: "bi bi-bag-fill" },
  { value: "bus", icon: "bi bi-bus-front-fill" },
  { value: "gift", icon: "bi bi-gift-fill" },
  { value: "game", icon: "bi bi-joystick" },
  { value: "house", icon: "bi bi-house-fill" },
  { value: "fuel", icon: "bi bi-fuel-pump-fill" },
];

export const transportOptions = [
  { value: "walk", text: "走路" },
  { value: "bike", text: "自行車" },
  { value: "scooter", text: "機車" },
  { value: "car", text: "開車" },
  { value: "MRT", text: "捷運" },
  { value: "train", text: "火車" },
  { value: "HSR", text: "高鐵" },
  { value: "taxi", text: "計程車" },
];

export const amenityOptions = [
  { value: null, text: "全部" },

  { key: "amenity", value: "cafe", text: "咖啡", types: ["node"] },
  { key: "amenity", value: "restaurant", text: "餐廳", types: ["node"] },

  { key: "tourism", value: "hotel", text: "旅館", types: ["node", "way"] },
  { key: "tourism", value: "motel", text: "汽車旅館", types: ["node", "way"] },
  { key: "tourism", value: "hostel", text: "青旅", types: ["node", "way"] },

  { key: "highway", value: "bus_stop", text: "公車站", types: ["node"] },

  { key: "amenity", value: "parking", text: "停車場", types: ["node", "way"] },
  { key: "amenity", value: "fuel", text: "加油站", types: ["node"] },

  { key: "leisure", value: "park", text: "公園", types: ["way", "relation"] },
  {
    key: "leisure",
    value: "swimming_pool",
    text: "泳池",
    types: ["node", "way"],
  },
  {
    key: "leisure",
    value: "sports_centre",
    text: "運動中心",
    types: ["way", "relation"],
  },

  { key: "religion", value: "christian", text: "教堂", types: ["node", "way"] },
  { key: "religion", value: "buddhist", text: "寺廟", types: ["node", "way"] },

  { key: "tourism", value: "museum", text: "博物館", types: ["node", "way"] },

  { key: "amenity", value: "pharmacy", text: "藥局", types: ["node"] },
  { key: "shop", value: "convenience", text: "便利商店", types: ["node"] },
  { key: "amenity", value: "toilets", text: "廁所", types: ["node"] },
  {
    key: "amenity",
    value: "bicycle_rental",
    text: "租腳踏車",
    types: ["node"],
  },
  { key: "leisure", value: "playground", text: "遊樂場", types: ["way"] },
  { key: "amenity", value: "cinema", text: "電影院", types: ["node"] },
];
