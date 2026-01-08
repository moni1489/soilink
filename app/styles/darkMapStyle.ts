export const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#121212" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#121212" }] },

  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1f1f1f" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9a9a9a" }],
  },

  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a1a2a" }],
  },

  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#181818" }],
  },

  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6f6f6f" }],
  },
];
