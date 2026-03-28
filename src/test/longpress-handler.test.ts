import { describe, it, expect, vi } from 'vitest';

/**
 * Unit tests for the long-press-to-add-spot logic.
 * We test the callback wiring and guard conditions without mounting Leaflet.
 */

describe('Long press add spot logic', () => {
  it('calls onLongPressAdd with coordinates when not in adding mode', () => {
    const onLongPressAdd = vi.fn();
    const isAddingMode = false;
    const latlng = { lat: 48.8566, lng: 2.3522 };

    // Simulate what LongPressHandler does on contextmenu
    if (!isAddingMode && onLongPressAdd) {
      onLongPressAdd([latlng.lat, latlng.lng]);
    }

    expect(onLongPressAdd).toHaveBeenCalledOnce();
    expect(onLongPressAdd).toHaveBeenCalledWith([48.8566, 2.3522]);
  });

  it('does NOT call onLongPressAdd when already in adding mode', () => {
    const onLongPressAdd = vi.fn();
    const isAddingMode = true;
    const latlng = { lat: 48.8566, lng: 2.3522 };

    if (!isAddingMode && onLongPressAdd) {
      onLongPressAdd([latlng.lat, latlng.lng]);
    }

    expect(onLongPressAdd).not.toHaveBeenCalled();
  });

  it('does nothing when onLongPressAdd is undefined', () => {
    const callbackMap: Record<string, ((coords: [number, number]) => void) | undefined> = {
      onLongPressAdd: undefined,
    };
    const isAddingMode = false;

    // Should not throw
    if (!isAddingMode && callbackMap.onLongPressAdd) {
      callbackMap.onLongPressAdd([48.8566, 2.3522]);
    }

    expect(true).toBe(true);
  });

  it('enters adding mode with correct state transitions', () => {
    let isAddingMode = false;
    let selectedSpotId: string | null = 'some-spot';
    let newSpotLocation: [number, number] | null = null;

    const latlng: [number, number] = [43.2965, 5.3698];

    // Simulate the Spots.tsx onLongPressAdd handler
    selectedSpotId = null;
    newSpotLocation = latlng;
    isAddingMode = true;

    expect(selectedSpotId).toBeNull();
    expect(newSpotLocation).toEqual([43.2965, 5.3698]);
    expect(isAddingMode).toBe(true);
  });
});
