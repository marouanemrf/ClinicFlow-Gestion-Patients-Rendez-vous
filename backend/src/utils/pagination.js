function buildPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function toOffset(page, limit) {
  return (page - 1) * limit;
}

module.exports = { buildPagination, toOffset };
