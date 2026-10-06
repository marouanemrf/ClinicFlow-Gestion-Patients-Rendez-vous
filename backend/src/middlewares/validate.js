const AppError = require('../utils/AppError');

function formatIssues(issues) {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Validates req.body / req.query / req.params with Zod schemas.
 * Parsed (trimmed, coerced) values are exposed on req.validated.
 */
function validate(schemas) {
  return (req, res, next) => {
    req.validated = req.validated || {};

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source] ?? {});
      if (!result.success) {
        const details = formatIssues(result.error.issues);
        throw AppError.badRequest(details[0].message, 'VALIDATION_ERROR', details);
      }
      req.validated[source] = result.data;
    }

    next();
  };
}

module.exports = validate;
