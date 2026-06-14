import type { ColorDef } from '../types'

export const COLORS: ColorDef[] = [
  { value: '#FF6B6B', title: 'Red' },
  { value: '#FFA94D', title: 'Orange' },
  { value: '#FFD93D', title: 'Yellow' },
  { value: '#6BCB77', title: 'Green' },
  { value: '#4D96FF', title: 'Blue' },
  { value: '#9B59B6', title: 'Purple' },
  { value: '#FF69B4', title: 'Pink' },
  { value: '#8B4513', title: 'Brown' },
  { value: '#2C3E50', title: 'Black' },
  { value: '#FFFFFF', title: 'White' },
]

/** Cycled through, one per character, while rainbow mode is on. */
export const RAINBOW_COLORS = [
  '#FF6B6B',
  '#FFA94D',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#9B59B6',
  '#FF69B4',
]
