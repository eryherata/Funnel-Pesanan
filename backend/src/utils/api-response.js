
export function sendOk(req, res, data, meta = {}) {
  res.json({
    ok: true,
    data,
    meta: {
      requestId: req.requestId || null,
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

export function sendCreated(req, res, data, meta = {}) {
  res.status(201).json({
    ok: true,
    data,
    meta: {
      requestId: req.requestId || null,
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

export function normalizePagination(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize || query.limit || 50)));
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function buildPageMeta(total, page, pageSize, extra = {}) {
  return {
    total: Number(total || 0),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)),
    ...extra,
  };
}
