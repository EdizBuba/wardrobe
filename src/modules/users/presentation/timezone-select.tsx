"use client";
import { useMemo, useState } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
function deviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
function offset(timezone: string) {
  return (
    new Intl.DateTimeFormat("fr", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}
function groupTimezones(current: string) {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add(current);
  zones.add("UTC");
  const groups = new Map<string, { value: string; label: string }[]>();
  for (const zone of zones) {
    const [region, ...rest] = zone.split("/");
    const key = rest.length ? region : "Autres";
    const city = (rest.length ? rest.join(" / ") : zone).replaceAll("_", " ");
    const zoneOffset = offset(zone);
    groups.set(key, [
      ...(groups.get(key) ?? []),
      {
        value: zone,
        label: city === zoneOffset ? city : `${city} (${zoneOffset})`,
      },
    ]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, options]) => ({
      region,
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
export function TimezoneSelect({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const device = useMemo(() => deviceTimezone(), []);
  const groups = useMemo(() => groupTimezones(defaultValue), [defaultValue]);
  return (
    <div className="field">
      <label htmlFor="timezone">Fuseau horaire</label>
      <select
        id="timezone"
        name="timezone"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        {groups.map(({ region, options }) => (
          <optgroup key={region} label={region}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="field-help">
        Il détermine la date du jour pour vos tenues et votre calendrier.
      </span>
      {device && device !== value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setValue(device)}
        >
          <LocateFixed size={16} />
          Utiliser le fuseau de cet appareil ({device.replaceAll("_", " ")})
        </Button>
      )}
    </div>
  );
}
