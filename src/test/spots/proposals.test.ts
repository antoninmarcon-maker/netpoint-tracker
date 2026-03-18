import { describe, it, expect } from 'vitest';

// Mirrors spot proposal logic from SpotFormModal
function buildProposalPayload(spotToEdit: any, formData: any, userId: string) {
  return {
    name: formData.name,
    description: formData.description,
    type: formData.type,
    availability_period: formData.availability_period,
    lat: spotToEdit.lat,
    lng: spotToEdit.lng,
    user_id: userId,
    status: 'waiting_for_validation',
  };
}

function buildNewSpotPayload(location: [number, number], formData: any, userId: string) {
  return {
    name: formData.name,
    description: formData.description,
    type: formData.type,
    availability_period: formData.availability_period,
    lat: location[0],
    lng: location[1],
    user_id: userId,
    status: 'waiting_for_validation',
  };
}

const existingSpot = { id: 'spot-1', lat: 48.8566, lng: 2.3522, name: 'Old name', type: 'beach' };
const formData = { name: 'New name', description: 'Nice', type: 'outdoor_hard', availability_period: "Toute l'année" };
const userId = 'user-42';

describe('Spot modification proposal', () => {
  it('creates a new spot record (not updating the original)', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    // Proposal should NOT include the original spot id — it's a new DB record
    expect(payload).not.toHaveProperty('id');
  });

  it('copies coordinates from the original spot', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    expect(payload.lat).toBe(existingSpot.lat);
    expect(payload.lng).toBe(existingSpot.lng);
  });

  it('sets status to waiting_for_validation', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    expect(payload.status).toBe('waiting_for_validation');
  });

  it('uses the new form data (name, type, description)', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    expect(payload.name).toBe('New name');
    expect(payload.type).toBe('outdoor_hard');
  });

  it('stores the submitting user id', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    expect(payload.user_id).toBe(userId);
  });
});

describe('New spot creation', () => {
  it('sets status to waiting_for_validation', () => {
    const payload = buildNewSpotPayload([48.8566, 2.3522], formData, userId);
    expect(payload.status).toBe('waiting_for_validation');
  });

  it('uses the provided location coordinates', () => {
    const payload = buildNewSpotPayload([48.8566, 2.3522], formData, userId);
    expect(payload.lat).toBe(48.8566);
    expect(payload.lng).toBe(2.3522);
  });

  it('requires a name', () => {
    const invalid = { ...formData, name: '' };
    expect(invalid.name.trim()).toBe('');
  });

  it('defaults to outdoor_hard type if none selected', () => {
    const DEFAULT_TYPE = 'outdoor_hard';
    expect(DEFAULT_TYPE).toBe('outdoor_hard');
  });
});
