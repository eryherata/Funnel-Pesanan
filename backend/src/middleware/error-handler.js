
export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: 'Endpoint tidak ditemukan.',
    details: { requestId: req.requestId || null },
  });
}

export function errorHandler(error, req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) {
    console.error('[api-error]', error);
  }
  res.status(status).json({
    ok: false,
    message: error.message || 'Terjadi kesalahan pada server.',
    details: {
      ...(error.details || {}),
      requestId: req.requestId || null,
      payload: error.payload || null,
    },
  });
}
