// Mock settingsRepository pour éviter toute connexion DB
jest.mock('../repositories/settingsRepository');
const settingsRepository = require('../repositories/settingsRepository');

const validateOrder = require('../middlewares/validateOrder');

// Helpers pour simuler req/res/next
const makeReq = (body) => ({ body });
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const next = jest.fn();

// Créneau valide dans ~60 min (lundi à 12h00 en Europe/Paris)
// On fixe une date/heure contrôlée via mock de Date
const MOCK_NOW_ISO = '2026-04-21T09:00:00.000Z'; // lundi 21 avril 2026 11h00 Paris

// Body valide de référence — créneau à 12h00 (dans 60 min)
const validBody = {
  customer: { name: 'Jean Dupont', phone: '0612345678', email: 'jean@test.fr' },
  delivery_address: '12 rue des Fleurs, Saint-Genis-Pouilly 01630',
  delivery_time: '12:00',
  items: [{ product_id: 1, quantity: 2, options: [] }],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Valeurs par défaut des settings
  settingsRepository.get.mockImplementation((key) => {
    const defaults = {
      opening_hour: '11',
      closing_hour: '15',
      closed_days: '[]',
      slot_interval: '30',
      min_delivery_delay: '30',
    };
    return Promise.resolve(defaults[key] ?? null);
  });

  // Fige le temps : lundi 21 avril 2026 à 11h00 Europe/Paris (= 09h00 UTC)
  jest.useFakeTimers();
  jest.setSystemTime(new Date(MOCK_NOW_ISO).getTime());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('validateOrder — champ customer', () => {
  test('passe avec un body valide', async () => {
    await validateOrder(makeReq(validBody), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejette si customer manquant', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, customer: undefined }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette si nom trop court', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, customer: { ...validBody.customer, name: 'A' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si téléphone trop court', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, customer: { ...validBody.customer, phone: '0612' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si email sans @', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, customer: { ...validBody.customer, email: 'pasunemail' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateOrder — adresse de livraison', () => {
  test('rejette si adresse manquante', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, delivery_address: '' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si adresse trop courte', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, delivery_address: 'abc' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si adresse hors zone (pas Saint-Genis ni 01630)', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, delivery_address: '10 rue de la Paix, Paris 75001' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Saint-Genis') }));
  });

  test('passe avec adresse contenant saint-genis (avec tiret)', async () => {
    await validateOrder(makeReq({ ...validBody, delivery_address: '5 allée du Lac, Saint-Genis-Pouilly' }), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('validateOrder — créneau de livraison', () => {
  test('rejette si delivery_time manquant', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, delivery_time: undefined }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si créneau hors plage horaire (avant ouverture)', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, delivery_time: '10:00' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si créneau hors plage horaire (après fermeture)', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, delivery_time: '16:00' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si créneau dans moins de 30 min', async () => {
    // Heure actuelle simulée : 11h00 Paris → créneau 11h15 est trop proche
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, delivery_time: '11:15' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si créneau sur un jour fermé', async () => {
    settingsRepository.get.mockImplementation((key) => {
      const defaults = {
        opening_hour: '11',
        closing_hour: '15',
        closed_days: JSON.stringify(['2026-04-21']), // aujourd'hui fermé
        slot_interval: '30',
        min_delivery_delay: '30',
      };
      return Promise.resolve(defaults[key] ?? null);
    });
    const res = makeRes();
    await validateOrder(makeReq(validBody), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateOrder — panier', () => {
  test('rejette si items et formula_items sont vides', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, items: [], formula_items: [] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si product_id invalide dans items', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, items: [{ product_id: 0, quantity: 1 }] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si quantity invalide dans items', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, items: [{ product_id: 1, quantity: 0 }] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si options n\'est pas un tableau', async () => {
    const res = makeRes();
    await validateOrder(makeReq({ ...validBody, items: [{ product_id: 1, quantity: 1, options: 'mauvais' }] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateOrder — formules', () => {
  const validWithFormula = {
    ...validBody,
    items: [],
    formula_items: [{
      formula_id: 1,
      quantity: 1,
      slots: [{ slot_name: 'banhmi', product_id: 2 }],
    }],
  };

  test('passe avec une formule valide', async () => {
    await validateOrder(makeReq(validWithFormula), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejette si formula_id invalide', async () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], formula_id: -1 }] };
    await validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si slots vide', async () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], slots: [] }] };
    await validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si slot_name manquant', async () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], slots: [{ product_id: 2 }] }] };
    await validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si product_id invalide dans slot', async () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], slots: [{ slot_name: 'banhmi', product_id: 0 }] }] };
    await validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
