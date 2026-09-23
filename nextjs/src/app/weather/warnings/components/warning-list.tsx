"use client";

import {
  countryFlag,
  elementLabel,
  formatWindow,
  warningKey,
  type Warning,
} from "../utils";
import { LevelPill } from "./level-pill";

/**
 * The warnings for the picked point, what is in force first and the severest
 * of those at the top. A warning that has not started yet is marked as
 * upcoming rather than left out, because that is the one worth knowing about
 * before it begins.
 */

interface WarningListProps {
  warnings: Warning[];
  selectedKey: string | null;
  onSelect(warning: Warning): void;
}

export function WarningList({
  warnings,
  selectedKey,
  onSelect,
}: WarningListProps) {
  return (
    <ul className="divide-y divide-cloud">
      {warnings.map((warning) => {
        const key = warningKey(warning);
        const isSelected = key === selectedKey;

        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSelect(warning)}
              className={`flex w-full items-start gap-3 py-3 text-left transition-colors ${
                isSelected ? "text-marine" : "text-dark hover:text-dark/70"
              }`}
            >
              <span className="mt-0.5">
                <LevelPill level={warning.level} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {elementLabel(warning.element)}{" "}
                  <span aria-hidden>{countryFlag(warning.countryCode)}</span>
                </span>
                <span className="block truncate text-xs text-dark/70">
                  {formatWindow(warning)}
                </span>
              </span>

              {!warning.active && (
                <span className="shrink-0 rounded-full bg-cloud-dark px-2 py-0.5 text-xs text-dark/70">
                  Upcoming
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
