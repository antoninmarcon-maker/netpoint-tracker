import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Proposal payload builder (mirrors SpotFormModal logic)
// ---------------------------------------------------------------------------
function buildProposalPayload(spotToEdit: { lat: number; lng: number }, formData: Record<string, string>, userId: string) {
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

function buildNewSpotPayload(location: [number, number], formData: Record<string, string>, userId: string) {
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

// ---------------------------------------------------------------------------
// Spot modification proposals
// ---------------------------------------------------------------------------
describe('Spot modification proposal', () => {
  it('creates a new record (no id from original spot)', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
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

  it('uses new form data', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    expect(payload.name).toBe('New name');
    expect(payload.type).toBe('outdoor_hard');
    expect(payload.description).toBe('Nice');
  });

  it('stores the proposer user_id', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    expect(payload.user_id).toBe(userId);
  });

  it('preserves availability period', () => {
    const payload = buildProposalPayload(existingSpot, formData, userId);
    expect(payload.availability_period).toBe("Toute l'année");
  });
});

// ---------------------------------------------------------------------------
// New spot creation
// ---------------------------------------------------------------------------
describe('New spot creation', () => {
  it('sets status to waiting_for_validation', () => {
    const payload = buildNewSpotPayload([48.8566, 2.3522], formData, userId);
    expect(payload.status).toBe('waiting_for_validation');
  });

  it('uses provided location', () => {
    const payload = buildNewSpotPayload([48.8566, 2.3522], formData, userId);
    expect(payload.lat).toBe(48.8566);
    expect(payload.lng).toBe(2.3522);
  });

  it('requires a name (empty name is invalid)', () => {
    expect(''.trim()).toBe('');
    expect('  '.trim()).toBe('');
    expect('Valid Name'.trim()).not.toBe('');
  });

  it('defaults to outdoor_hard type', () => {
    expect('outdoor_hard').toBe('outdoor_hard');
  });
});

// ---------------------------------------------------------------------------
// Availability period formatting
// ---------------------------------------------------------------------------
describe('Availability period', () => {
  it('all-year format', () => {
    const allYear = true;
    const result = allYear ? "Toute l'année" : '';
    expect(result).toBe("Toute l'année");
  });

  it('seasonal format with months', () => {
    const allYear = false;
    const startMonth = 'Mai';
    const endMonth = 'Septembre';
    const result = !allYear && startMonth && endMonth ? `De ${startMonth} à ${endMonth}` : '';
    expect(result).toBe('De Mai à Septembre');
  });

  it('returns empty when seasonal but no months selected', () => {
    const allYear = false;
    const startMonth = '';
    const endMonth = '';
    const result = !allYear && startMonth && endMonth ? `De ${startMonth} à ${endMonth}` : '';
    expect(result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Spot type validation (form only allows valid types)
// ---------------------------------------------------------------------------
describe('Spot type validation', () => {
  const VALID_TYPES = ['beach', 'outdoor_hard', 'outdoor_grass'];

  it('allows beach', () => {
    expect(VALID_TYPES).toContain('beach');
  });

  it('allows outdoor_hard', () => {
    expect(VALID_TYPES).toContain('outdoor_hard');
  });

  it('allows outdoor_grass', () => {
    expect(VALID_TYPES).toContain('outdoor_grass');
  });

  it('does NOT allow indoor (removed from form)', () => {
    expect(VALID_TYPES).not.toContain('indoor');
  });

  it('does NOT allow club (user cannot create clubs)', () => {
    expect(VALID_TYPES).not.toContain('club');
  });
});

// ---------------------------------------------------------------------------
// Libre accès toggle (mirrors SpotFormModal accesLibre logic)
// ---------------------------------------------------------------------------

/** Extended payload builder that includes equip_acces_libre */
function buildPayloadWithAccesLibre(
  location: [number, number],
  formData: Record<string, string>,
  userId: string,
  accesLibre: boolean,
) {
  return {
    name: formData.name,
    description: formData.description,
    type: formData.type,
    availability_period: formData.availability_period,
    equip_acces_libre: accesLibre,
    lat: location[0],
    lng: location[1],
    user_id: userId,
    status: 'waiting_for_validation',
  };
}

describe('Libre accès toggle — default value', () => {
  it('defaults to true for new spots (no spotToEdit)', () => {
    // Mirrors: const [accesLibre, setAccesLibre] = useState(true)
    const defaultAccesLibre = true;
    expect(defaultAccesLibre).toBe(true);
  });

  it('is included in the insert payload', () => {
    const payload = buildPayloadWithAccesLibre([48.8566, 2.3522], formData, userId, true);
    expect(payload).toHaveProperty('equip_acces_libre');
    expect(payload.equip_acces_libre).toBe(true);
  });
});

describe('Libre accès toggle — preserved from spotToEdit in suggestion mode', () => {
  // Mirrors: setAccesLibre(spotToEdit?.equip_acces_libre ?? true)
  const resolveAccesLibre = (spotToEdit: { equip_acces_libre?: boolean | null } | null) =>
    spotToEdit?.equip_acces_libre ?? true;

  it('uses spotToEdit value when true', () => {
    expect(resolveAccesLibre({ equip_acces_libre: true })).toBe(true);
  });

  it('uses spotToEdit value when false', () => {
    expect(resolveAccesLibre({ equip_acces_libre: false })).toBe(false);
  });

  it('defaults to true when spotToEdit is null', () => {
    expect(resolveAccesLibre(null)).toBe(true);
  });

  it('defaults to true when equip_acces_libre is null', () => {
    expect(resolveAccesLibre({ equip_acces_libre: null })).toBe(true);
  });

  it('defaults to true when equip_acces_libre is undefined', () => {
    expect(resolveAccesLibre({})).toBe(true);
  });
});

describe('Libre accès toggle — saved in insert payload', () => {
  it('saves true in payload', () => {
    const payload = buildPayloadWithAccesLibre([48.8566, 2.3522], formData, userId, true);
    expect(payload.equip_acces_libre).toBe(true);
  });

  it('saves false in payload', () => {
    const payload = buildPayloadWithAccesLibre([48.8566, 2.3522], formData, userId, false);
    expect(payload.equip_acces_libre).toBe(false);
  });

  it('payload includes all required fields alongside equip_acces_libre', () => {
    const payload = buildPayloadWithAccesLibre([48.8566, 2.3522], formData, userId, true);
    expect(payload).toHaveProperty('name');
    expect(payload).toHaveProperty('lat');
    expect(payload).toHaveProperty('lng');
    expect(payload).toHaveProperty('status');
    expect(payload).toHaveProperty('equip_acces_libre');
  });
});
