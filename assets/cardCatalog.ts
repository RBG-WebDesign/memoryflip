import ramModuleSvg from '@/assets/cards-vivid/ram-module.svg';
import ssdDriveSvg from '@/assets/cards-vivid/ssd-drive.svg';
import cpuChipSvg from '@/assets/cards-vivid/cpu-chip.svg';
import gpuCardSvg from '@/assets/cards-vivid/gpu-card.svg';
import motherboardSvg from '@/assets/cards-vivid/motherboard.svg';
import coolingFanSvg from '@/assets/cards-vivid/cooling-fan.svg';
import usbDriveSvg from '@/assets/cards-vivid/usb-drive.svg';
import hardDriveSvg from '@/assets/cards-vivid/hard-drive.svg';
import floppyDiskSvg from '@/assets/cards-vivid/floppy-disk.svg';
import cdSvg from '@/assets/cards-vivid/cd.svg';
import hdmiCableSvg from '@/assets/cards-vivid/hdmi-cable.svg';
import circuitBoardSvg from '@/assets/cards-vivid/circuit-board.svg';
import binaryPatternSvg from '@/assets/cards-vivid/binary-pattern.svg';
import samsungLaptopSilhouetteSvg from '@/assets/cards-vivid/samsung-laptop-silhouette.svg';
import monitorSilhouetteSvg from '@/assets/cards-vivid/monitor-silhouette.svg';
import memoryChipSvg from '@/assets/cards-vivid/memory-chip.svg';

export interface CardArt {
  id: string;
  label: string;
  src: string;
}

const CARD_ART: Record<string, CardArt> = {
  'ram-module': {
    id: 'ram-module',
    label: 'RAM Module',
    src: ramModuleSvg,
  },
  'ssd-drive': {
    id: 'ssd-drive',
    label: 'SSD Drive',
    src: ssdDriveSvg,
  },
  'cpu-chip': {
    id: 'cpu-chip',
    label: 'CPU Chip',
    src: cpuChipSvg,
  },
  'gpu-card': {
    id: 'gpu-card',
    label: 'GPU Card',
    src: gpuCardSvg,
  },
  motherboard: {
    id: 'motherboard',
    label: 'Motherboard',
    src: motherboardSvg,
  },
  'circuit-board': {
    id: 'circuit-board',
    label: 'Circuit Board',
    src: circuitBoardSvg,
  },
  'cooling-fan': {
    id: 'cooling-fan',
    label: 'Cooling Fan',
    src: coolingFanSvg,
  },
  'usb-drive': {
    id: 'usb-drive',
    label: 'USB Flash Drive',
    src: usbDriveSvg,
  },
  'hdmi-cable': {
    id: 'hdmi-cable',
    label: 'HDMI Cable',
    src: hdmiCableSvg,
  },
  'hard-drive': {
    id: 'hard-drive',
    label: 'Hard Drive',
    src: hardDriveSvg,
  },
  'floppy-disk': {
    id: 'floppy-disk',
    label: 'Floppy Disk',
    src: floppyDiskSvg,
  },
  cd: {
    id: 'cd',
    label: 'CD Disc',
    src: cdSvg,
  },
  'binary-pattern': {
    id: 'binary-pattern',
    label: 'Binary Pattern',
    src: binaryPatternSvg,
  },
  'samsung-laptop-silhouette': {
    id: 'samsung-laptop-silhouette',
    label: 'Samsung Laptop',
    src: samsungLaptopSilhouetteSvg,
  },
  'monitor-silhouette': {
    id: 'monitor-silhouette',
    label: 'Monitor',
    src: monitorSilhouetteSvg,
  },
  'memory-chip': {
    id: 'memory-chip',
    label: 'Memory Chip',
    src: memoryChipSvg,
  },
};

export const CARD_ART_IDS = Object.keys(CARD_ART);

export const getCardArt = (id: string): CardArt => {
  return CARD_ART[id] ?? {
    id,
    label: id.replace(/-/g, ' '),
    src: ramModuleSvg,
  };
};
