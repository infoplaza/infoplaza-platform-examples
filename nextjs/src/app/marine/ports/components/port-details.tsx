import {
  availability,
  CAPABILITY_GROUPS,
  DEPTH_FIELDS,
  fieldLabel,
  formatCoordinates,
  formatMetres,
  hasVesselLimits,
  orUnknown,
  regionName,
  sizeLabel,
  VESSEL_FIELDS,
  type Availability,
  type CapabilityGroup,
  type PortInfo,
} from "../utils";

/**
 * Everything the index holds on the active port, shown under the map.
 *
 * The Port Info API answers with a hundred-odd fields in ten groups, and most
 * of them are "Yes", "No" or "Unknown". Reading that as a table would be
 * unbearable, so each group becomes a card of chips: what the port has stands
 * out, what it lacks is greyed, and what was never surveyed is outlined
 * rather than dropped — an unsurveyed port is not a port without cranes.
 */

interface PortDetailsProps {
  port: PortInfo;
}

export function PortDetails({ port }: PortDetailsProps) {
  const depths = DEPTH_FIELDS.filter((field) => port.depths[field.key] !== null);

  return (
    <article className="rounded-lg border border-cloud-dark bg-white p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{port.name}</h2>
          <p className="mt-0.5 text-sm text-dark/80">
            {port.country}
            {port.alternate_name && (
              <span className="text-dark/50"> · {port.alternate_name}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {port.unlocode && (
            <span className="rounded-md bg-cloud-dark px-2 py-1 font-mono text-xs text-dark/85">
              {port.unlocode}
            </span>
          )}
          <span className="rounded-md bg-dark px-2 py-1 text-xs font-medium text-white">
            {sizeLabel(port.size)}
          </span>
        </div>
      </header>

      <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <Section title="Where it is">
          <dl className="divide-y divide-cloud text-sm">
            <Detail label="Coordinates">
              <span className="tabular-nums">{formatCoordinates(port)}</span>
            </Detail>
            <Detail label="Region">{regionName(port.region)}</Detail>
            <Detail label="Waterbody">{port.waterbody}</Detail>
            <Detail label="NAVAREA">{orUnknown(port.nav_area)}</Detail>
          </dl>
        </Section>

        <Section title="The harbour">
          <dl className="divide-y divide-cloud text-sm">
            <Detail label="Type">{orUnknown(port.harbor_type)}</Detail>
            <Detail label="Use">{orUnknown(port.harbor_use)}</Detail>
            <Detail label="Shelter">{orUnknown(port.shelter)}</Detail>
            <Detail label="Repairs">{orUnknown(port.repair.code)}</Detail>
            <Detail label="Dry dock">{orUnknown(port.repair.dry_dock)}</Detail>
            <Detail label="Marine railway">
              {orUnknown(port.repair.railway)}
            </Detail>
          </dl>
        </Section>

        <Section title="Depths">
          {depths.length === 0 ? (
            <p className="text-sm text-dark/70">
              No depths are recorded for this port.
            </p>
          ) : (
            <dl className="divide-y divide-cloud text-sm">
              {depths.map((field) => (
                <Detail key={field.key} label={field.label}>
                  <span className="tabular-nums">
                    {formatMetres(port.depths[field.key] as number)}
                  </span>
                </Detail>
              ))}
            </dl>
          )}
        </Section>

        <Section title="Largest vessel handled">
          {!hasVesselLimits(port.max_vessel) ? (
            <p className="text-sm text-dark/70">
              No vessel dimensions are recorded for this port.
            </p>
          ) : (
            <dl className="divide-y divide-cloud text-sm">
              {VESSEL_FIELDS.map((field) => (
                <Detail key={field.key} label={field.label}>
                  <span className="tabular-nums">
                    {port.max_vessel[field.key] === null
                      ? "Unknown"
                      : formatMetres(port.max_vessel[field.key] as number)}
                  </span>
                </Detail>
              ))}
            </dl>
          )}
        </Section>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-dark/50">
            What the port offers
          </h3>
          <Legend />
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITY_GROUPS.map((group) => (
            <CapabilityCard
              key={group.key}
              title={group.title}
              group={port[group.key] as CapabilityGroup}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-dark/50">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** One row of a detail list: label on the left, value on the right. */
function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-dark/70">{label}</dt>
      <dd className="min-w-0 text-right text-dark">{children}</dd>
    </div>
  );
}

/** One capability group as a card of chips, what the port has listed first. */
function CapabilityCard({
  title,
  group,
}: {
  title: string;
  group: CapabilityGroup;
}) {
  const entries = Object.entries(group ?? {}).sort(
    ([, a], [, b]) => rank(availability(a)) - rank(availability(b)),
  );
  const offered = entries.filter(
    ([, value]) => availability(value) === "yes",
  ).length;

  return (
    <div className="rounded-lg border border-cloud-dark bg-white p-4">
      <h4 className="flex items-baseline justify-between gap-2 text-sm font-medium text-dark">
        {title}
        <span className="text-xs font-normal text-dark/50">
          {offered}/{entries.length}
        </span>
      </h4>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {entries.map(([key, value]) => (
          <li key={key}>
            <Chip state={availability(value)}>{fieldLabel(key)}</Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Available first, then unavailable, then whatever was never surveyed. */
function rank(state: Availability): number {
  return { yes: 0, no: 1, unknown: 2 }[state];
}

const CHIP_STYLES: Record<Availability, string> = {
  yes: "border-emerald-200 bg-emerald-50 text-emerald-800",
  no: "border-transparent bg-cloud-dark text-dark/50 line-through decoration-cloud-darker",
  unknown: "border-dashed border-cloud-darker text-dark/50",
};

const CHIP_TITLES: Record<Availability, string> = {
  yes: "Available",
  no: "Not available",
  unknown: "Not recorded",
};

function Chip({
  state,
  children,
}: {
  state: Availability;
  children: React.ReactNode;
}) {
  return (
    <span
      title={CHIP_TITLES[state]}
      className={`inline-block rounded border px-1.5 py-0.5 text-xs ${CHIP_STYLES[state]}`}
    >
      {children}
    </span>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-dark/70">
      {(["yes", "no", "unknown"] as const).map((state) => (
        <li key={state} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`inline-block h-3 w-3 rounded border ${CHIP_STYLES[state]}`}
          />
          {CHIP_TITLES[state]}
        </li>
      ))}
    </ul>
  );
}
