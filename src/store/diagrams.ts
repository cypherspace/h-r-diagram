import type { AxisConfig, SavedDiagram } from "../types";

const KEY = "hrd:diagrams:v1";

function readAll(): Record<string, SavedDiagram> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, SavedDiagram>): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function listDiagrams(): SavedDiagram[] {
  return Object.values(readAll()).sort((a, b) => b.savedAt - a.savedAt);
}

export function saveDiagram(
  name: string,
  starIds: string[],
  axes: AxisConfig,
): SavedDiagram {
  const map = readAll();
  const diagram: SavedDiagram = {
    name,
    savedAt: Date.now(),
    starIds,
    axes,
  };
  map[name] = diagram;
  writeAll(map);
  return diagram;
}

export function loadDiagram(name: string): SavedDiagram | undefined {
  return readAll()[name];
}

export function deleteDiagram(name: string): void {
  const map = readAll();
  delete map[name];
  writeAll(map);
}
