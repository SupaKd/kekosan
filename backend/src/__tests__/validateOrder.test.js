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

// Body valide de référence
const validBody = {
  customer: { name: 'Jean Dupont', phone: '0612345678', email: 'jean@test.fr' },
  delivery_address: '12 rue des Fleurs, Saint-Genis-Pouilly',
  items: [{ product_id: 1, quantity: 2, options: [] }],
};

beforeEach(() => {
  next.mockClear();
});

describe('validateOrder — champ customer', () => {
  test('passe avec un body valide', () => {
    validateOrder(makeReq(validBody), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejette si customer manquant', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, customer: undefined }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejette si nom trop court', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, customer: { ...validBody.customer, name: 'A' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si téléphone trop court', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, customer: { ...validBody.customer, phone: '0612' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si email sans @', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, customer: { ...validBody.customer, email: 'pasunemail' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateOrder — adresse de livraison', () => {
  test('rejette si adresse manquante', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, delivery_address: '' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si adresse trop courte', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, delivery_address: 'abc' }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateOrder — panier', () => {
  test('rejette si items et formula_items sont vides', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, items: [], formula_items: [] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si product_id invalide dans items', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, items: [{ product_id: 0, quantity: 1 }] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si quantity invalide dans items', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, items: [{ product_id: 1, quantity: 0 }] }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si options n\'est pas un tableau', () => {
    const res = makeRes();
    validateOrder(makeReq({ ...validBody, items: [{ product_id: 1, quantity: 1, options: 'mauvais' }] }), res, next);
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

  test('passe avec une formule valide', () => {
    validateOrder(makeReq(validWithFormula), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rejette si formula_id invalide', () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], formula_id: -1 }] };
    validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si slots vide', () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], slots: [] }] };
    validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si slot_name manquant', () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], slots: [{ product_id: 2 }] }] };
    validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejette si product_id invalide dans slot', () => {
    const res = makeRes();
    const body = { ...validWithFormula, formula_items: [{ ...validWithFormula.formula_items[0], slots: [{ slot_name: 'banhmi', product_id: 0 }] }] };
    validateOrder(makeReq(body), res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
