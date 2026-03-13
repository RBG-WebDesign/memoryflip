import memoryChip from '../assets/cards-vivid/memory-chip.svg';
import gpuCard from '../assets/cards-vivid/gpu-card.svg';
import motherboard from '../assets/cards-vivid/motherboard.svg';
import hardDrive from '../assets/cards-vivid/hard-drive.svg';
import ssdDrive from '../assets/cards-vivid/ssd-drive.svg';
import ramModule from '../assets/cards-vivid/ram-module.svg';
import circuitBoard from '../assets/cards-vivid/circuit-board.svg';
import coolingFan from '../assets/cards-vivid/cooling-fan.svg';
import usbDrive from '../assets/cards-vivid/usb-drive.svg';
import hdmiCable from '../assets/cards-vivid/hdmi-cable.svg';
import monitor from '../assets/cards-vivid/monitor-silhouette.svg';
import floppyDisk from '../assets/cards-vivid/floppy-disk.svg';
import cd from '../assets/cards-vivid/cd.svg';
import binaryPattern from '../assets/cards-vivid/binary-pattern.svg';
import laptop from '../assets/cards-vivid/samsung-laptop-silhouette.svg';

export const ALL_ICONS = [
  { name: 'Memory Chip', icon: memoryChip },
  { name: 'GPU Card', icon: gpuCard },
  { name: 'Motherboard', icon: motherboard },
  { name: 'Hard Drive', icon: hardDrive },
  { name: 'SSD Drive', icon: ssdDrive },
  { name: 'RAM Module', icon: ramModule },
  { name: 'Circuit Board', icon: circuitBoard },
  { name: 'Cooling Fan', icon: coolingFan },
  { name: 'USB Drive', icon: usbDrive },
  { name: 'HDMI Cable', icon: hdmiCable },
  { name: 'Monitor', icon: monitor },
  { name: 'Floppy Disk', icon: floppyDisk },
  { name: 'CD', icon: cd },
  { name: 'Binary', icon: binaryPattern },
  { name: 'Laptop', icon: laptop },
];

// --- Game Modes ---
export const GAME_MODES = {
  ENDLESS: 'ENDLESS',
  SURVIVOR: 'SURVIVOR',
};

// --- Shared preview-time curve ---
function getPreviewTime(level) {
  if (level === 1) return 4000;
  if (level === 2) return 3800;
  const adjusted = level - 2;
  if (adjusted <= 5) return 3800 - (adjusted - 1) * 200;
  if (adjusted <= 10) return 3000 - (adjusted - 5) * 140;
  if (adjusted <= 20) return 2300 - (adjusted - 10) * 80;
  return Math.max(1300, 1500 - (adjusted - 20) * 20);
}

// --- Shared pairs/grid curve ---
function getPairsAndGrid(level) {
  if (level === 1) return { pairs: 2, gridClass: 'grid-cols-2' };
  if (level === 2) return { pairs: 3, gridClass: 'grid-cols-3' };
  return { pairs: 6, gridClass: 'grid-cols-4' };
}

// --- Level Config ---
export function getLevelConfig(level, mode = GAME_MODES.ENDLESS) {
  const { pairs, gridClass } = getPairsAndGrid(level);
  const previewTime = getPreviewTime(level);
  const base = { pairs, gridClass, previewTime };

  if (mode === GAME_MODES.SURVIVOR) {
    return {
      ...base,
      maxHealth: 100,
      damagePerMiss: Math.min(12 + (level - 1) * 1.5, 24),
    };
  }

  return base;
}

// Legacy lookup — keeps old references working during transition
export const LEVEL_CONFIG = new Proxy({}, {
  get(_, key) {
    const level = parseInt(key, 10);
    if (!isNaN(level)) return getLevelConfig(level);
    return undefined;
  },
});
