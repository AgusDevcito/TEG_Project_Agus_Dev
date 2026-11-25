import type {
  ContinentDefinition,
  ContinentId,
  TerritoryDefinition,
  TerritoryState,
} from '../../types/game.ts';

export const CONTINENTS: Record<ContinentId, ContinentDefinition> = {
  america_del_sur: {
    id: 'america_del_sur',
    name: 'América del Sur',
    bonus: 3,
    color: '#2e8b57',
  },
  america_del_norte: {
    id: 'america_del_norte',
    name: 'América del Norte',
    bonus: 5,
    color: '#c97a2b',
  },
  europa: {
    id: 'europa',
    name: 'Europa',
    bonus: 5,
    color: '#3b6ea5',
  },
  asia: {
    id: 'asia',
    name: 'Asia',
    bonus: 7,
    color: '#b54545',
  },
  africa: {
    id: 'africa',
    name: 'África',
    bonus: 3,
    color: '#a67c37',
  },
  oceania: {
    id: 'oceania',
    name: 'Oceanía',
    bonus: 2,
    color: '#7a4fa3',
  },
};

/**
 * Los 50 países oficiales del TEG (Táctica y Estrategia de la Guerra)
 * con sus 6 continentes, adyacencias simétricas (incluyendo puentes marítimos)
 * y símbolos de tarjeta.
 */
export const TERRITORIES: readonly TerritoryDefinition[] = [
  // ===================== AMÉRICA DEL SUR (6) =====================
  {
    id: 'colombia',
    name: 'Colombia',
    continent: 'america_del_sur',
    neighbors: ['mexico', 'peru', 'brasil'],
    cardSymbol: 'galeon',
    position: [-5.4, 0.8],
  },
  {
    id: 'peru',
    name: 'Perú',
    continent: 'america_del_sur',
    neighbors: ['colombia', 'brasil', 'argentina', 'chile'],
    cardSymbol: 'galeon',
    position: [-5.5, 2.0],
  },
  {
    id: 'brasil',
    name: 'Brasil',
    continent: 'america_del_sur',
    neighbors: ['colombia', 'peru', 'argentina', 'uruguay', 'sahara'],
    cardSymbol: 'galeon',
    position: [-4.2, 2.0],
  },
  {
    id: 'chile',
    name: 'Chile',
    continent: 'america_del_sur',
    neighbors: ['peru', 'argentina', 'australia'],
    cardSymbol: 'globo',
    position: [-5.6, 3.6],
  },
  {
    id: 'argentina',
    name: 'Argentina',
    continent: 'america_del_sur',
    neighbors: ['peru', 'brasil', 'uruguay', 'chile'],
    cardSymbol: 'comodin',
    position: [-4.8, 4.1],
  },
  {
    id: 'uruguay',
    name: 'Uruguay',
    continent: 'america_del_sur',
    neighbors: ['brasil', 'argentina'],
    cardSymbol: 'globo',
    position: [-4.1, 3.4],
  },

  // ===================== AMÉRICA DEL NORTE (10) =====================
  {
    id: 'alaska',
    name: 'Alaska',
    continent: 'america_del_norte',
    neighbors: ['yukon', 'oregon', 'kamchatka'],
    cardSymbol: 'galeon',
    position: [-8.8, -4.2],
  },
  {
    id: 'yukon',
    name: 'Yukón',
    continent: 'america_del_norte',
    neighbors: ['alaska', 'canada', 'oregon'],
    cardSymbol: 'globo',
    position: [-7.5, -4.0],
  },
  {
    id: 'canada',
    name: 'Canadá',
    continent: 'america_del_norte',
    neighbors: ['yukon', 'oregon', 'nueva_york', 'terranova'],
    cardSymbol: 'canon',
    position: [-6.0, -3.8],
  },
  {
    id: 'oregon',
    name: 'Oregón',
    continent: 'america_del_norte',
    neighbors: ['alaska', 'yukon', 'canada', 'nueva_york', 'california'],
    cardSymbol: 'canon',
    position: [-7.4, -2.5],
  },
  {
    id: 'california',
    name: 'California',
    continent: 'america_del_norte',
    neighbors: ['oregon', 'nueva_york', 'mexico'],
    cardSymbol: 'canon',
    position: [-7.2, -1.2],
  },
  {
    id: 'mexico',
    name: 'México',
    continent: 'america_del_norte',
    neighbors: ['california', 'colombia'],
    cardSymbol: 'canon',
    position: [-6.6, 0.0],
  },
  {
    id: 'nueva_york',
    name: 'Nueva York',
    continent: 'america_del_norte',
    neighbors: ['canada', 'terranova', 'oregon', 'california', 'groenlandia'],
    cardSymbol: 'galeon',
    position: [-5.6, -1.8],
  },
  {
    id: 'terranova',
    name: 'Terranova',
    continent: 'america_del_norte',
    neighbors: ['canada', 'labrador', 'nueva_york'],
    cardSymbol: 'canon',
    position: [-4.7, -2.8],
  },
  {
    id: 'labrador',
    name: 'Labrador',
    continent: 'america_del_norte',
    neighbors: ['terranova', 'groenlandia'],
    cardSymbol: 'canon',
    position: [-4.3, -3.8],
  },
  {
    id: 'groenlandia',
    name: 'Groenlandia',
    continent: 'america_del_norte',
    neighbors: ['labrador', 'nueva_york', 'islandia'],
    cardSymbol: 'globo',
    position: [-3.2, -4.6],
  },

  // ===================== EUROPA (9) =====================
  {
    id: 'islandia',
    name: 'Islandia',
    continent: 'europa',
    neighbors: ['groenlandia', 'gran_bretana', 'suecia'],
    cardSymbol: 'galeon',
    position: [-1.5, -4.2],
  },
  {
    id: 'gran_bretana',
    name: 'Gran Bretaña',
    continent: 'europa',
    neighbors: ['islandia', 'espana', 'alemania'],
    cardSymbol: 'galeon',
    position: [-1.2, -2.6],
  },
  {
    id: 'espana',
    name: 'España',
    continent: 'europa',
    neighbors: ['gran_bretana', 'francia', 'sahara'],
    cardSymbol: 'globo',
    position: [-1.2, -0.9],
  },
  {
    id: 'francia',
    name: 'Francia',
    continent: 'europa',
    neighbors: ['espana', 'alemania', 'italia'],
    cardSymbol: 'globo',
    position: [-0.3, -1.5],
  },
  {
    id: 'alemania',
    name: 'Alemania',
    continent: 'europa',
    neighbors: ['gran_bretana', 'francia', 'italia', 'polonia'],
    cardSymbol: 'galeon',
    position: [0.4, -2.2],
  },
  {
    id: 'italia',
    name: 'Italia',
    continent: 'europa',
    neighbors: ['francia', 'alemania'],
    cardSymbol: 'globo',
    position: [0.4, -0.9],
  },
  {
    id: 'suecia',
    name: 'Suecia',
    continent: 'europa',
    neighbors: ['islandia', 'rusia'],
    cardSymbol: 'galeon',
    position: [0.8, -4.0],
  },
  {
    id: 'polonia',
    name: 'Polonia',
    continent: 'europa',
    neighbors: ['alemania', 'rusia', 'turquia', 'egipto'],
    cardSymbol: 'canon',
    position: [1.3, -1.8],
  },
  {
    id: 'rusia',
    name: 'Rusia',
    continent: 'europa',
    neighbors: ['suecia', 'polonia', 'turquia', 'iran', 'aral'],
    cardSymbol: 'globo',
    position: [2.4, -2.9],
  },

  // ===================== ÁFRICA (6) =====================
  {
    id: 'sahara',
    name: 'Sahara',
    continent: 'africa',
    neighbors: ['brasil', 'espana', 'egipto', 'etiopia', 'zaire'],
    cardSymbol: 'canon',
    position: [-0.8, 1.0],
  },
  {
    id: 'egipto',
    name: 'Egipto',
    continent: 'africa',
    neighbors: ['sahara', 'etiopia', 'polonia', 'turquia', 'israel', 'madagascar'],
    cardSymbol: 'globo',
    position: [1.0, 0.8],
  },
  {
    id: 'etiopia',
    name: 'Etiopía',
    continent: 'africa',
    neighbors: ['sahara', 'egipto', 'zaire', 'sudafrica'],
    cardSymbol: 'globo',
    position: [1.2, 2.2],
  },
  {
    id: 'zaire',
    name: 'Zaire',
    continent: 'africa',
    neighbors: ['sahara', 'etiopia', 'sudafrica', 'madagascar'],
    cardSymbol: 'galeon',
    position: [0.1, 2.6],
  },
  {
    id: 'sudafrica',
    name: 'Sudáfrica',
    continent: 'africa',
    neighbors: ['zaire', 'etiopia'],
    cardSymbol: 'canon',
    position: [0.8, 4.0],
  },
  {
    id: 'madagascar',
    name: 'Madagascar',
    continent: 'africa',
    neighbors: ['zaire', 'egipto'],
    cardSymbol: 'galeon',
    position: [2.1, 3.7],
  },

  // ===================== ASIA (15) =====================
  {
    id: 'aral',
    name: 'Aral',
    continent: 'asia',
    neighbors: ['rusia', 'tartaria', 'siberia', 'mongolia', 'iran'],
    cardSymbol: 'canon',
    position: [3.8, -3.2],
  },
  {
    id: 'tartaria',
    name: 'Tartaria',
    continent: 'asia',
    neighbors: ['aral', 'taimir', 'siberia'],
    cardSymbol: 'canon',
    position: [4.7, -4.4],
  },
  {
    id: 'taimir',
    name: 'Taimir',
    continent: 'asia',
    neighbors: ['tartaria', 'siberia'],
    cardSymbol: 'comodin',
    position: [6.0, -4.6],
  },
  {
    id: 'siberia',
    name: 'Siberia',
    continent: 'asia',
    neighbors: ['tartaria', 'taimir', 'aral', 'mongolia', 'china', 'kamchatka'],
    cardSymbol: 'galeon',
    position: [6.2, -3.3],
  },
  {
    id: 'kamchatka',
    name: 'Kamchatka',
    continent: 'asia',
    neighbors: ['siberia', 'china', 'japon', 'alaska'],
    cardSymbol: 'globo',
    position: [8.2, -3.6],
  },
  {
    id: 'japon',
    name: 'Japón',
    continent: 'asia',
    neighbors: ['kamchatka', 'china'],
    cardSymbol: 'canon',
    position: [8.8, -1.6],
  },
  {
    id: 'mongolia',
    name: 'Mongolia',
    continent: 'asia',
    neighbors: ['aral', 'siberia', 'china', 'gobi', 'iran'],
    cardSymbol: 'galeon',
    position: [5.4, -2.1],
  },
  {
    id: 'gobi',
    name: 'Gobi',
    continent: 'asia',
    neighbors: ['mongolia', 'china', 'iran'],
    cardSymbol: 'globo',
    position: [5.3, -1.0],
  },
  {
    id: 'iran',
    name: 'Irán',
    continent: 'asia',
    neighbors: ['rusia', 'aral', 'mongolia', 'gobi', 'china', 'india', 'turquia'],
    cardSymbol: 'globo',
    position: [3.8, -1.2],
  },
  {
    id: 'turquia',
    name: 'Turquía',
    continent: 'asia',
    neighbors: ['rusia', 'polonia', 'egipto', 'israel', 'arabia', 'iran'],
    cardSymbol: 'galeon',
    position: [2.4, -0.7],
  },
  {
    id: 'israel',
    name: 'Israel',
    continent: 'asia',
    neighbors: ['turquia', 'egipto', 'arabia'],
    cardSymbol: 'galeon',
    position: [2.3, 0.3],
  },
  {
    id: 'arabia',
    name: 'Arabia',
    continent: 'asia',
    neighbors: ['turquia', 'israel'],
    cardSymbol: 'canon',
    position: [3.2, 0.6],
  },
  {
    id: 'china',
    name: 'China',
    continent: 'asia',
    neighbors: ['siberia', 'kamchatka', 'japon', 'mongolia', 'gobi', 'iran', 'india', 'malasia'],
    cardSymbol: 'galeon',
    position: [6.8, -1.2],
  },
  {
    id: 'india',
    name: 'India',
    continent: 'asia',
    neighbors: ['iran', 'china', 'malasia', 'sumatra'],
    cardSymbol: 'globo',
    position: [5.2, 0.6],
  },
  {
    id: 'malasia',
    name: 'Malasia',
    continent: 'asia',
    neighbors: ['china', 'india', 'borneo'],
    cardSymbol: 'canon',
    position: [6.7, 0.8],
  },

  // ===================== OCEANÍA (4) =====================
  {
    id: 'sumatra',
    name: 'Sumatra',
    continent: 'oceania',
    neighbors: ['india', 'australia'],
    cardSymbol: 'globo',
    position: [5.9, 2.3],
  },
  {
    id: 'borneo',
    name: 'Borneo',
    continent: 'oceania',
    neighbors: ['malasia', 'australia'],
    cardSymbol: 'galeon',
    position: [7.2, 2.1],
  },
  {
    id: 'java',
    name: 'Java',
    continent: 'oceania',
    neighbors: ['australia'],
    cardSymbol: 'canon',
    position: [8.2, 2.6],
  },
  {
    id: 'australia',
    name: 'Australia',
    continent: 'oceania',
    neighbors: ['sumatra', 'borneo', 'java', 'chile'],
    cardSymbol: 'canon',
    position: [7.5, 4.0],
  },
] as const;

export const TERRITORY_MAP: Record<string, TerritoryDefinition> = Object.fromEntries(
  TERRITORIES.map((territory) => [territory.id, territory]),
);

export function getTerritoryDefinition(territoryId: string): TerritoryDefinition | undefined {
  return TERRITORY_MAP[territoryId];
}

export function areNeighbors(fromId: string, toId: string): boolean {
  const from = TERRITORY_MAP[fromId];
  return from ? from.neighbors.includes(toId) : false;
}

export function getContinentTerritories(continentId: ContinentId): TerritoryDefinition[] {
  return TERRITORIES.filter((t) => t.continent === continentId);
}

export function getControlledContinents(
  playerId: string,
  territories: Record<string, TerritoryState>,
): ContinentId[] {
  return (Object.keys(CONTINENTS) as ContinentId[]).filter((continentId) => {
    const continentTerritories = getContinentTerritories(continentId);
    return continentTerritories.every((t) => territories[t.id]?.ownerId === playerId);
  });
}

export function getPlayerTerritoryCount(
  playerId: string,
  territories: Record<string, TerritoryState>,
): number {
  let count = 0;
  for (const territory of Object.values(territories)) {
    if (territory.ownerId === playerId) {
      count += 1;
    }
  }
  return count;
}
