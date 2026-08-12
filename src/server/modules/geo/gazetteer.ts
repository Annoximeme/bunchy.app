/**
 * Place lookup behind an adapter.
 *
 * Onboarding needs to turn "Antwerp" into a country, a region label and coarse
 * coordinates. A hosted geocoding API would do that, but none is provisioned
 * here and a city picker that returns nothing is a broken feature — so the
 * default implementation is a built-in gazetteer of populated places. It works
 * offline, costs nothing and never sends a member's location to a third party.
 *
 * Swapping in a real geocoder means implementing `Geocoder` and changing
 * `geocoder()`. Nothing else moves. Note that only city-level records are ever
 * used: the interface has no concept of a street address on purpose.
 */

export interface Place {
  cityLabel: string;
  regionLabel: string;
  countryCode: string;
  lat: number;
  lng: number;
}

export interface Geocoder {
  search(query: string, limit?: number): Promise<Place[]>;
}

type Row = [city: string, region: string, country: string, lat: number, lng: number];

const PLACES: Row[] = [
  // Belgium — the founding market.
  ["Antwerp", "Antwerp region", "BE", 51.2194, 4.4025],
  ["Ghent", "East Flanders", "BE", 51.0543, 3.7174],
  ["Brussels", "Brussels-Capital", "BE", 50.8503, 4.3517],
  ["Bruges", "West Flanders", "BE", 51.2093, 3.2247],
  ["Leuven", "Flemish Brabant", "BE", 50.8798, 4.7005],
  ["Mechelen", "Antwerp region", "BE", 51.0259, 4.4776],
  ["Hasselt", "Limburg", "BE", 50.9307, 5.3325],
  ["Kortrijk", "West Flanders", "BE", 50.8279, 3.2649],
  ["Liège", "Liège", "BE", 50.6326, 5.5797],
  ["Namur", "Namur", "BE", 50.4674, 4.8718],
  ["Turnhout", "Antwerp region", "BE", 51.3226, 4.9447],
  ["Aalst", "East Flanders", "BE", 50.9378, 4.0355],
  ["Sint-Niklaas", "East Flanders", "BE", 51.1649, 4.1437],
  ["Genk", "Limburg", "BE", 50.9650, 5.5008],
  ["Ostend", "West Flanders", "BE", 51.2247, 2.9156],

  // Netherlands.
  ["Amsterdam", "North Holland", "NL", 52.3676, 4.9041],
  ["Rotterdam", "South Holland", "NL", 51.9244, 4.4777],
  ["The Hague", "South Holland", "NL", 52.0705, 4.3007],
  ["Utrecht", "Utrecht", "NL", 52.0907, 5.1214],
  ["Eindhoven", "North Brabant", "NL", 51.4416, 5.4697],
  ["Breda", "North Brabant", "NL", 51.5719, 4.7683],
  ["Tilburg", "North Brabant", "NL", 51.5555, 5.0913],
  ["Groningen", "Groningen", "NL", 53.2194, 6.5665],
  ["Maastricht", "Limburg", "NL", 50.8514, 5.6910],

  // Rest of Europe.
  ["Paris", "Île-de-France", "FR", 48.8566, 2.3522],
  ["Lyon", "Auvergne-Rhône-Alpes", "FR", 45.7640, 4.8357],
  ["Lille", "Hauts-de-France", "FR", 50.6292, 3.0573],
  ["Berlin", "Berlin", "DE", 52.5200, 13.4050],
  ["Munich", "Bavaria", "DE", 48.1351, 11.5820],
  ["Hamburg", "Hamburg", "DE", 53.5511, 9.9937],
  ["Cologne", "North Rhine-Westphalia", "DE", 50.9375, 6.9603],
  ["Frankfurt", "Hesse", "DE", 50.1109, 8.6821],
  ["London", "Greater London", "GB", 51.5074, -0.1278],
  ["Manchester", "Greater Manchester", "GB", 53.4808, -2.2426],
  ["Edinburgh", "Scotland", "GB", 55.9533, -3.1883],
  ["Dublin", "Leinster", "IE", 53.3498, -6.2603],
  ["Madrid", "Community of Madrid", "ES", 40.4168, -3.7038],
  ["Barcelona", "Catalonia", "ES", 41.3874, 2.1686],
  ["Lisbon", "Lisbon", "PT", 38.7223, -9.1393],
  ["Porto", "Porto", "PT", 41.1579, -8.6291],
  ["Rome", "Lazio", "IT", 41.9028, 12.4964],
  ["Milan", "Lombardy", "IT", 45.4642, 9.1900],
  ["Zurich", "Zurich", "CH", 47.3769, 8.5417],
  ["Vienna", "Vienna", "AT", 48.2082, 16.3738],
  ["Prague", "Prague", "CZ", 50.0755, 14.4378],
  ["Warsaw", "Masovia", "PL", 52.2297, 21.0122],
  ["Kraków", "Lesser Poland", "PL", 50.0647, 19.9450],
  ["Copenhagen", "Capital Region", "DK", 55.6761, 12.5683],
  ["Stockholm", "Stockholm", "SE", 59.3293, 18.0686],
  ["Oslo", "Oslo", "NO", 59.9139, 10.7522],
  ["Helsinki", "Uusimaa", "FI", 60.1699, 24.9384],
  ["Athens", "Attica", "GR", 37.9838, 23.7275],
  ["Budapest", "Budapest", "HU", 47.4979, 19.0402],
  ["Bucharest", "Bucharest", "RO", 44.4268, 26.1025],

  // Elsewhere, so the product is not unusable outside Europe.
  ["New York", "New York", "US", 40.7128, -74.0060],
  ["San Francisco", "California", "US", 37.7749, -122.4194],
  ["Los Angeles", "California", "US", 34.0522, -118.2437],
  ["Chicago", "Illinois", "US", 41.8781, -87.6298],
  ["Austin", "Texas", "US", 30.2672, -97.7431],
  ["Seattle", "Washington", "US", 47.6062, -122.3321],
  ["Toronto", "Ontario", "CA", 43.6532, -79.3832],
  ["Vancouver", "British Columbia", "CA", 49.2827, -123.1207],
  ["Montreal", "Quebec", "CA", 45.5019, -73.5674],
  ["São Paulo", "São Paulo", "BR", -23.5505, -46.6333],
  ["Mexico City", "Mexico City", "MX", 19.4326, -99.1332],
  ["Buenos Aires", "Buenos Aires", "AR", -34.6037, -58.3816],
  ["Sydney", "New South Wales", "AU", -33.8688, 151.2093],
  ["Melbourne", "Victoria", "AU", -37.8136, 144.9631],
  ["Auckland", "Auckland", "NZ", -36.8485, 174.7633],
  ["Tokyo", "Tokyo", "JP", 35.6762, 139.6503],
  ["Osaka", "Osaka", "JP", 34.6937, 135.5023],
  ["Seoul", "Seoul", "KR", 37.5665, 126.9780],
  ["Singapore", "Singapore", "SG", 1.3521, 103.8198],
  ["Bangalore", "Karnataka", "IN", 12.9716, 77.5946],
  ["Mumbai", "Maharashtra", "IN", 19.0760, 72.8777],
  ["Delhi", "Delhi", "IN", 28.6139, 77.2090],
  ["Dubai", "Dubai", "AE", 25.2048, 55.2708],
  ["Cape Town", "Western Cape", "ZA", -33.9249, 18.4241],
  ["Johannesburg", "Gauteng", "ZA", -26.2041, 28.0473],
  ["Lagos", "Lagos", "NG", 6.5244, 3.3792],
  ["Nairobi", "Nairobi", "KE", -1.2921, 36.8219],
  ["Tel Aviv", "Tel Aviv", "IL", 32.0853, 34.7818],
  ["Istanbul", "Istanbul", "TR", 41.0082, 28.9784],
];

const ALL: Place[] = PLACES.map(([cityLabel, regionLabel, countryCode, lat, lng]) => ({
  cityLabel,
  regionLabel,
  countryCode,
  lat,
  lng,
}));

/** Strips diacritics so "Liege" finds "Liège". */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

class StaticGazetteer implements Geocoder {
  async search(query: string, limit = 8): Promise<Place[]> {
    const needle = fold(query);
    if (needle.length === 0) return ALL.slice(0, limit);

    const scored: Array<{ place: Place; rank: number }> = [];
    for (const place of ALL) {
      const city = fold(place.cityLabel);
      const region = fold(place.regionLabel);

      // Prefix beats substring beats region match, so typing "ant" surfaces
      // Antwerp before Southampton.
      const rank = city.startsWith(needle)
        ? 0
        : city.includes(needle)
          ? 1
          : region.startsWith(needle)
            ? 2
            : region.includes(needle)
              ? 3
              : -1;

      if (rank >= 0) scored.push({ place, rank });
    }

    return scored
      .sort(
        (a, b) =>
          a.rank - b.rank || a.place.cityLabel.localeCompare(b.place.cityLabel),
      )
      .slice(0, limit)
      .map((s) => s.place);
  }
}

let override: Geocoder | undefined;

/** Test seam / future real-provider registration point. */
export function setGeocoder(next: Geocoder | undefined) {
  override = next;
}

export function geocoder(): Geocoder {
  return override ?? new StaticGazetteer();
}

/** Exact city lookup, used when a member re-submits a previously chosen place. */
export function findPlace(cityLabel: string, countryCode: string): Place | undefined {
  return ALL.find(
    (p) =>
      fold(p.cityLabel) === fold(cityLabel) &&
      p.countryCode === countryCode.toUpperCase(),
  );
}
