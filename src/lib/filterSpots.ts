import { EXTERIOR_TYPES, type SpotFiltersState } from '@/components/spots/SpotFilters';
import type { Tables } from '@/integrations/supabase/types';

type Spot = Tables<'spots_with_coords'>;

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterSpots(spots: Spot[], filters: SpotFiltersState, userPosition: [number, number] | null): Spot[] {
  return spots.filter(spot => {
    const type = spot.type || 'outdoor_hard';

    // Pending mode: show all waiting spots, bypass every other filter
    if (filters.showPending) {
      return spot.status === 'waiting_for_validation';
    }

    if (spot.status !== 'validated') return false;

    // Gymnasiums are never shown
    if (type === 'indoor') return false;

    // Main category gates
    if (type === 'club' && !filters.showClubs) return false;
    const isExterior = EXTERIOR_TYPES.includes(type);
    if (isExterior && !filters.showExterieur) return false;

    // Exterior sub-type gates
    if (isExterior) {
      if (type === 'beach' && !filters.subFilters.ext_beach) return false;
      if ((type === 'green_volley' || type === 'outdoor_grass') && !filters.subFilters.ext_herbe) return false;
      if (type === 'outdoor_hard' && !filters.subFilters.ext_dur) return false;

      if (filters.subFilters.acces_libre && !spot.equip_acces_libre) return false;

      if (type === 'beach') {
        if (filters.subFilters.beach_eclairage && !spot.equip_eclairage) return false;
        if (filters.subFilters.beach_pmr && !spot.equip_pmr) return false;
        if (filters.subFilters.beach_saison === 'annee' && spot.equip_saisonnier) return false;
        if (filters.subFilters.beach_saison === 'saisonnier' && !spot.equip_saisonnier) return false;
      }

      if (type === 'green_volley' || type === 'outdoor_grass') {
        if (filters.subFilters.green_saison === 'annee' && spot.equip_saisonnier) return false;
        if (filters.subFilters.green_saison === 'saisonnier' && !spot.equip_saisonnier) return false;
        if (filters.subFilters.green_sol === 'naturel' && spot.equip_sol !== 'Gazon naturel') return false;
        if (filters.subFilters.green_sol === 'synthetique' && spot.equip_sol !== 'Gazon synthétique') return false;
      }
    }

    return true;
  });
}
