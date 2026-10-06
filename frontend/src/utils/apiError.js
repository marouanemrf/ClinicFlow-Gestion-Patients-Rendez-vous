const NETWORK_ERROR = 'Unable to reach the server. Please check your connection.';

/** Extracts a user-friendly message from an Axios error using the API error format. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (!error.response) return error.request ? NETWORK_ERROR : error.message || fallback;

  const { status, data } = error.response;
  if (data?.message) return data.message;
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  return fallback;
}

/** Maps backend validation details ({ field, message }[]) to { field: message }. */
export function getFieldErrors(error) {
  const details = error?.response?.data?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.filter((detail) => detail.field).map((detail) => [detail.field, detail.message]));
}

export function getErrorCode(error) {
  return error?.response?.data?.error;
}
