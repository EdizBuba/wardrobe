export type AvailabilityItem = {
  id: string;
  userId: string;
  name: string;
  locationId: string;
  status: string;
  archivedAt: Date | string | null;
};
export type AvailabilityReason = {
  itemId: string;
  itemName: string;
  code: "WRONG_OWNER" | "ARCHIVED" | "STATUS" | "LOCATION";
  value?: string;
};
export function itemAvailability(
  item: AvailabilityItem,
  userId: string,
  locationId: string,
) {
  const reasons: AvailabilityReason[] = [];
  if (item.userId !== userId)
    reasons.push({ itemId: item.id, itemName: "", code: "WRONG_OWNER" });
  else {
    if (item.archivedAt)
      reasons.push({ itemId: item.id, itemName: item.name, code: "ARCHIVED" });
    if (item.status !== "AVAILABLE")
      reasons.push({
        itemId: item.id,
        itemName: item.name,
        code: "STATUS",
        value: item.status,
      });
    if (item.locationId !== locationId)
      reasons.push({
        itemId: item.id,
        itemName: item.name,
        code: "LOCATION",
        value: item.locationId,
      });
  }
  return { wearable: reasons.length === 0, reasons };
}
export function variantAvailability(
  items: AvailabilityItem[],
  userId: string,
  locationId: string,
) {
  const checks = items.map((item) =>
    itemAvailability(item, userId, locationId),
  );
  const count = checks.filter((check) => check.wearable).length;
  return {
    status:
      items.length > 0 && count === items.length
        ? "AVAILABLE"
        : count > 0
          ? "PARTIALLY_AVAILABLE"
          : "UNAVAILABLE",
    reasons: checks.flatMap((check) => check.reasons),
    availableCount: count,
    totalCount: items.length,
  };
}
