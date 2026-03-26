import { describe, it, expect } from "vitest";
import { sortSpotPhotos, SpotPhoto } from "@/lib/sortSpotPhotos";

describe("sortSpotPhotos", () => {
  it("sorts by category order: terrain → action → groupe → vue_exterieure → logo", () => {
    const photos: SpotPhoto[] = [
      { photo_url: "logo.jpg", photo_category: "logo" },
      { photo_url: "terrain.jpg", photo_category: "terrain" },
      { photo_url: "action.jpg", photo_category: "action" },
      { photo_url: "vue.jpg", photo_category: "vue_exterieure" },
      { photo_url: "groupe.jpg", photo_category: "groupe" },
    ];

    const sorted = sortSpotPhotos(photos);
    expect(sorted.map((p) => p.photo_category)).toEqual([
      "terrain",
      "action",
      "groupe",
      "vue_exterieure",
      "logo",
    ]);
  });

  it("hero photo always sorts first", () => {
    const photos: SpotPhoto[] = [
      { photo_url: "logo.jpg", photo_category: "logo" },
      { photo_url: "hero.jpg", photo_category: "action", is_hero: true },
      { photo_url: "terrain.jpg", photo_category: "terrain" },
    ];

    const sorted = sortSpotPhotos(photos);
    expect(sorted[0].photo_url).toBe("hero.jpg");
    expect(sorted[0].is_hero).toBe(true);
  });

  it("photos without category sort last", () => {
    const photos: SpotPhoto[] = [
      { photo_url: "no-cat.jpg" },
      { photo_url: "terrain.jpg", photo_category: "terrain" },
      { photo_url: "null-cat.jpg", photo_category: null },
    ];

    const sorted = sortSpotPhotos(photos);
    expect(sorted[0].photo_url).toBe("terrain.jpg");
    expect(sorted[1].photo_category).toBeFalsy();
    expect(sorted[2].photo_category).toBeFalsy();
  });

  it("does not mutate the original array", () => {
    const photos: SpotPhoto[] = [
      { photo_url: "b.jpg", photo_category: "logo" },
      { photo_url: "a.jpg", photo_category: "terrain" },
    ];
    const original = [...photos];
    sortSpotPhotos(photos);
    expect(photos).toEqual(original);
  });

  it("handles empty array", () => {
    expect(sortSpotPhotos([])).toEqual([]);
  });

  it("hero without category still sorts first", () => {
    const photos: SpotPhoto[] = [
      { photo_url: "terrain.jpg", photo_category: "terrain" },
      { photo_url: "hero.jpg", is_hero: true },
    ];

    const sorted = sortSpotPhotos(photos);
    expect(sorted[0].photo_url).toBe("hero.jpg");
  });
});
