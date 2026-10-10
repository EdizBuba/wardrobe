import { describe, it, expect } from "vitest";
import {
  itemAvailability,
  variantAvailability,
} from "@/modules/wardrobe/domain/availability";
const item = {
  id: "item",
  userId: "alice",
  name: "Jean",
  status: "AVAILABLE",
  archivedAt: null,
  locationId: "home",
};
describe("wearability", () => {
  it("requires an active available owned item at the selected location", () => {
    expect(itemAvailability(item, "alice", "home").wearable).toBe(true);
    for (const modified of [
      { ...item, status: "DIRTY" },
      { ...item, archivedAt: new Date() },
      { ...item, locationId: "parents" },
      { ...item, userId: "bob" },
    ])
      expect(itemAvailability(modified, "alice", "home").wearable).toBe(false);
  });
  it("explains location and status independently", () => {
    const result = variantAvailability(
      [item, { ...item, id: "other", status: "DIRTY", locationId: "parents" }],
      "alice",
      "home",
    );
    expect(result.status).toBe("PARTIALLY_AVAILABLE");
    expect(result.reasons.map((r) => r.code)).toEqual(["STATUS", "LOCATION"]);
  });
  it("does not treat an empty variant as available", () => {
    expect(variantAvailability([], "alice", "home").status).toBe("UNAVAILABLE");
  });
  it("does not disclose a foreign owner's item name", () => {
    expect(itemAvailability(item, "bob", "home").reasons[0].itemName).toBe("");
  });
});
