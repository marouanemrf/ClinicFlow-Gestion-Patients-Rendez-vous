const { z } = require('zod');

const uuidParam = z.object({
  id: z.uuid({ message: 'Invalid id format' }),
});

const pageQuery = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

// Query strings such as ?status= should behave like an absent filter.
const optionalFilter = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

module.exports = { uuidParam, pageQuery, optionalText, optionalFilter };
